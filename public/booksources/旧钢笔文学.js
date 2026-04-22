// @name        旧钢笔文学
// @version     1.0.0
// @author      Legado Tauri
// @url         https://www.jiugangbi.com
// @type        novel
// @enabled     true
// @tags        免费,小说,言情,GBK
// @description 旧钢笔文学（jiugangbi.com），免费小说在线阅读站。

var BASE = 'https://www.jiugangbi.com';
var SEARCH_URL = BASE + '/modules/article/search.php';
var BOOK_URL_RE = /\/book\/\d+\/$/;
var CHAPTER_URL_RE = /\/book\/\d+\/\d+(?:_\d+)?\.html$/;

async function TEST(type) {
  if (type === '__list__') return ['search', 'explore'];

  if (type === 'search') {
    var results = await search('我的男友非人类', 1);
    if (!results || results.length < 1) return { passed: false, message: '搜索结果为空' };
    return { passed: true, message: '搜索返回 ' + results.length + ' 条结果' };
  }

  if (type === 'explore') {
    var books = await explore(1, '总点击榜');
    if (!books || books.length < 1) return { passed: false, message: '发现页为空' };
    return { passed: true, message: '发现页返回 ' + books.length + ' 条结果' };
  }

  return { passed: false, message: '未知测试类型: ' + type };
}

function trim(s) {
  return String(s || '').replace(/^\s+|\s+$/g, '');
}

function cleanText(s) {
  return trim(String(s || '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' '));
}

function stripTags(s) {
  return cleanText(String(s || '').replace(/<br\s*\/?>/ig, '\n').replace(/<[^>]+>/g, ' '));
}

function toAbs(href, baseUrl) {
  if (!href) return '';
  href = trim(href);
  if (href.indexOf('http://') === 0 || href.indexOf('https://') === 0) return href;
  if (href.indexOf('//') === 0) return 'https:' + href;
  if (href.charAt(0) === '/') return BASE + href;

  if (baseUrl) {
    var i = baseUrl.lastIndexOf('/');
    if (i >= 0) return baseUrl.slice(0, i + 1) + href;
  }
  return BASE + '/' + href;
}

function selectCover(el) {
  return legado.dom.selectAttr(el, 'img', 'data-original')
      || legado.dom.selectAttr(el, 'img', 'data-src')
      || legado.dom.selectAttr(el, 'img', 'src')
      || '';
}

function pushBook(books, seen, book) {
  if (!book || !book.name || !book.bookUrl) return;
  if (seen[book.bookUrl]) return;
  seen[book.bookUrl] = 1;
  books.push(book);
}

function parseNovelBoxes(doc) {
  var books = [];
  var seen = {};
  var items = legado.dom.selectAll(doc, '.novel_box');

  for (var i = 0; i < items.length; i++) {
    var el = items[i];
    var href = legado.dom.selectAttr(el, '.novel_name a', 'href')
            || legado.dom.selectAttr(el, '.pic a', 'href')
            || '';
    var name = legado.dom.selectText(el, '.novel_name a')
            || legado.dom.selectAttr(el, '.pic img', 'alt')
            || '';

    pushBook(books, seen, {
      name: cleanText(name),
      author: cleanText((legado.dom.selectText(el, '.novel_author a') || '').replace(/^作者[：:]\s*/, '')),
      bookUrl: toAbs(href),
      coverUrl: toAbs(selectCover(el)),
      intro: cleanText(legado.dom.selectText(el, '.novel_intro') || ''),
      lastChapter: cleanText(legado.dom.selectText(el, '.novel_newest a') || ''),
    });
  }

  return books;
}

function parseTopList(doc) {
  var books = [];
  var seen = {};
  var items = legado.dom.selectAll(doc, '.list_ul li');

  for (var i = 0; i < items.length; i++) {
    var el = items[i];
    var href = legado.dom.selectAttr(el, '.p1 a', 'href') || '';
    if (!BOOK_URL_RE.test(href.replace(BASE, ''))) continue;

    pushBook(books, seen, {
      name: cleanText(legado.dom.selectText(el, '.p1 a') || ''),
      author: cleanText(legado.dom.selectText(el, '.p3') || ''),
      bookUrl: toAbs(href),
      lastChapter: cleanText(legado.dom.selectText(el, '.p2 a') || ''),
      kind: cleanText(legado.dom.selectText(el, '.p6') || ''),
    });
  }

  return books;
}

function parseHomeBooks(doc) {
  var books = [];
  var seen = {};
  var links = legado.dom.selectAll(doc, 'a[href*="/book/"]');

  for (var i = 0; i < links.length; i++) {
    var href = legado.dom.attr(links[i], 'href') || '';
    var url = toAbs(href);
    if (!BOOK_URL_RE.test(url.replace(BASE, ''))) continue;

    var name = cleanText(legado.dom.text(links[i]) || legado.dom.attr(links[i], 'title') || '');
    if (!name) {
      var imgAlt = legado.dom.selectAttr(links[i], 'img', 'alt') || '';
      name = cleanText(imgAlt);
    }
    if (!name || /^\d+$/.test(name)) continue;

    pushBook(books, seen, { name: name, bookUrl: url, coverUrl: toAbs(selectCover(links[i])) });
  }

  return books;
}

function parseBooks(html) {
  var doc = legado.dom.parse(html);
  var books = parseNovelBoxes(doc);
  if (books.length === 0) books = parseTopList(doc);
  if (books.length === 0) books = parseHomeBooks(doc);
  legado.dom.free(doc);
  return books;
}

async function search(keyword, page) {
  legado.log('[search] keyword=' + keyword + ', page=' + page);
  var body = 'searchkey=' + legado.urlEncodeCharset(String(keyword || ''), 'gbk');
  var html = await legado.http.post(SEARCH_URL, body, {
    'Content-Type': 'application/x-www-form-urlencoded',
    'Referer': BASE + '/',
  });
  var books = parseBooks(html);
  legado.log('[search] found=' + books.length);
  return books;
}

async function bookInfo(bookUrl) {
  legado.log('[bookInfo] url=' + bookUrl);
  var html = await legado.http.get(bookUrl);
  var doc = legado.dom.parse(html);

  var intro = legado.dom.selectAttr(doc, '[property="og:description"]', 'content')
           || legado.dom.html(legado.dom.select(doc, '.catalognovel_intro'))
           || '';
  intro = stripTags(intro)
    .replace(/最新章节阅读地址是https?:\/\/\S+/g, '')
    .replace(/全文免费阅读由旧[^。]+。?/g, '')
    .replace(/如果您喜欢[^。]+。?/g, '');

  var result = {
    name: cleanText(legado.dom.selectAttr(doc, '[property="og:novel:book_name"]', 'content')
       || legado.dom.selectAttr(doc, '[property="og:title"]', 'content')
       || legado.dom.selectText(doc, '.novelname') || ''),
    author: cleanText(legado.dom.selectAttr(doc, '[property="og:novel:author"]', 'content')
       || legado.dom.selectText(doc, '.novelauthor a') || ''),
    coverUrl: toAbs(legado.dom.selectAttr(doc, '[property="og:image"]', 'content')
       || selectCover(doc)),
    intro: cleanText(intro),
    kind: cleanText(legado.dom.selectAttr(doc, '[property="og:novel:category"]', 'content')
       || legado.dom.selectText(doc, '.catalognovel_type .p2') || ''),
    lastChapter: cleanText(legado.dom.selectAttr(doc, '[property="og:novel:latest_chapter_name"]', 'content')
       || legado.dom.selectAttr(doc, '[property="og:novel:lastest_chapter_name"]', 'content')
       || legado.dom.selectText(doc, '.catalognovel_newest a') || ''),
    tocUrl: bookUrl,
  };

  legado.dom.free(doc);
  return result;
}

async function chapterList(tocUrl) {
  legado.log('[chapterList] url=' + tocUrl);
  var html = await legado.http.get(tocUrl);
  var doc = legado.dom.parse(html);
  var boxes = legado.dom.selectAll(doc, '.listchapter');
  var best = doc;
  var bestCount = 0;

  for (var b = 0; b < boxes.length; b++) {
    var count = 0;
    var testLinks = legado.dom.selectAll(boxes[b], 'a[href*="/book/"]');
    for (var t = 0; t < testLinks.length; t++) {
      var testHref = legado.dom.attr(testLinks[t], 'href') || '';
      if (CHAPTER_URL_RE.test(toAbs(testHref).replace(BASE, ''))) count++;
    }
    if (count > bestCount) {
      bestCount = count;
      best = boxes[b];
    }
  }

  var chapters = [];
  var seen = {};
  var links = legado.dom.selectAll(best, 'a[href*="/book/"]');
  for (var i = 0; i < links.length; i++) {
    var href = legado.dom.attr(links[i], 'href') || '';
    var url = toAbs(href, tocUrl);
    if (!CHAPTER_URL_RE.test(url.replace(BASE, ''))) continue;

    var name = cleanText(legado.dom.text(links[i]) || '');
    if (name && !seen[url]) {
      seen[url] = 1;
      chapters.push({ name: name, url: url });
    }
  }

  legado.dom.free(doc);
  legado.log('[chapterList] total=' + chapters.length);
  return chapters;
}

function cleanContentLine(line) {
  line = String(line || '')
    .replace(/<script[\s\S]*?<\/script>/ig, '')
    .replace(/<style[\s\S]*?<\/style>/ig, '')
    .replace(/<font[\s\S]*?<\/font>/ig, '')
    .replace(/<a[\s\S]*?<\/a>/ig, '')
    .replace(/<[^>]+>/g, ' ');
  line = legado.htmlDecode(line);
  line = cleanText(line);
  if (!line) return '';
  if (/您现在阅读的是|本章未完|请点击下一页|章节报错|加入书签|推荐本书/.test(line)) return '';
  if (/旧钢笔文学.*努力为你分享更多好看的小说/.test(line)) return '';
  return line;
}

async function chapterContent(chapterUrl) {
  legado.log('[content] url=' + chapterUrl);
  var url = chapterUrl;
  var paragraphs = [];
  var seenPages = {};

  for (var p = 0; p < 10; p++) {
    if (seenPages[url]) break;
    seenPages[url] = 1;

    var html = await legado.http.get(url);
    var doc = legado.dom.parse(html);
    var contentEl = legado.dom.select(doc, '.chapter_content');
    if (!contentEl) {
      legado.dom.free(doc);
      break;
    }

    var contentHtml = legado.dom.html(contentEl) || '';
    var parts = contentHtml.split(/<br\s*\/?>/i);
    for (var i = 0; i < parts.length; i++) {
      var line = cleanContentLine(parts[i]);
      if (line) paragraphs.push(line);
    }

    var nextLink = legado.dom.selectByText(doc, '下一页');
    var nextHref = nextLink ? (legado.dom.attr(nextLink, 'href') || '') : '';
    legado.dom.free(doc);

    if (!nextHref || nextHref.indexOf('javascript') >= 0) break;
    var nextUrl = toAbs(nextHref, url);
    if (nextUrl === url) break;
    url = nextUrl;
  }

  legado.log('[content] paragraphs=' + paragraphs.length);
  return paragraphs.join('\n\n');
}

var EXPLORE_CATEGORIES = [
  { name: '青春校园', path: '/sort/1_{page}.html' },
  { name: '古代言情', path: '/sort/2_{page}.html' },
  { name: '穿越快穿', path: '/sort/3_{page}.html' },
  { name: '百合耽美', path: '/sort/4_{page}.html' },
  { name: '现代言情', path: '/sort/5_{page}.html' },
  { name: '虐心甜宠', path: '/sort/6_{page}.html' },
  { name: '仙侠武侠', path: '/sort/7_{page}.html' },
  { name: '美文小说', path: '/sort/8_{page}.html' },
  { name: '完本小说', path: '/full/{page}.html' },
  { name: '总点击榜', path: '/top/allvisit_{page}.html' },
  { name: '月点击榜', path: '/top/monthvisit_{page}.html' },
  { name: '周点击榜', path: '/top/weekvisit_{page}.html' },
  { name: '总推荐榜', path: '/top/allvote_{page}.html' },
  { name: '月推荐榜', path: '/top/monthvote_{page}.html' },
  { name: '周推荐榜', path: '/top/weekvote_{page}.html' },
  { name: '收藏榜', path: '/top/goodnum_{page}.html' },
  { name: '字数榜', path: '/top/size_{page}.html' },
  { name: '最新入库', path: '/top/postdate_{page}.html' },
  { name: '最近更新', path: '/top/lastupdate_{page}.html' },
];

function categoryNames() {
  var names = [];
  for (var i = 0; i < EXPLORE_CATEGORIES.length; i++) {
    names.push(EXPLORE_CATEGORIES[i].name);
  }
  return names;
}

async function explore(page, category) {
  page = page || 1;
  legado.log('[explore] page=' + page + ', category=' + category);

  if (!category || category === 'GETALL') return categoryNames();

  var cat = null;
  for (var i = 0; i < EXPLORE_CATEGORIES.length; i++) {
    if (EXPLORE_CATEGORIES[i].name === category) {
      cat = EXPLORE_CATEGORIES[i];
      break;
    }
  }
  if (!cat) return categoryNames();

  var url = BASE + cat.path.replace('{page}', page);
  var html = await legado.http.get(url);
  var books = parseBooks(html);
  legado.log('[explore] found=' + books.length);
  return books;
}
