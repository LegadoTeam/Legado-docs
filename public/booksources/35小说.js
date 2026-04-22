// @name        35小说
// @version     1.0.0
// @author      Legado Tauri
// @url         http://www.35ge.info
// @logo        http://www.35ge.info/favicon.ico
// @enabled true
// @tags        免费,小说,免费小说
// @description 35中文网（原 swsk.org），免费网文小说站。

// ─── 内置测试 ─────────────────────────────────────────────────────────────

async function TEST(type) {
  if (type === '__list__') return ['search', 'explore', 'bookInfo', 'chapterList', 'chapterContent'];

  if (type === 'search') {
    var results = await search('斗破苍穹', 1);
    if (!results || results.length < 1) return { passed: false, message: '搜索结果为空' };
    var found = false;
    for (var i = 0; i < results.length; i++) {
      if (results[i].author && results[i].author.indexOf('天蚕土豆') !== -1) { found = true; break; }
    }
    if (!found) return { passed: false, message: '搜索结果中未找到作者包含"天蚕土豆"的条目' };
    return { passed: true, message: '搜索"斗破苍穹"返回 ' + results.length + ' 条结果 ✓' };
  }

  if (type === 'explore') {
    var books = await explore(1, '玄幻魔法');
    if (!books || books.length < 1 || typeof books[0] === 'string') return { passed: false, message: '发现页 [玄幻魔法] 返回为空或格式错误' };
    return { passed: true, message: '发现页 [玄幻魔法]: ' + books.length + ' 条结果 ✓' };
  }

  if (type === 'bookInfo') {
    var r = await bookInfo('http://www.35ge.info/xs/412/412532/');
    return { passed: !!r.name, message: 'bookInfo name=' + r.name };
  }

  if (type === 'chapterList') {
    var r = await chapterList('http://www.35ge.info/xs/412/412532/');
    return { passed: r.length > 0, message: 'chapterList cnt=' + r.length + ' first=' + (r[0] ? r[0].name : 'N/A') };
  }

  if (type === 'chapterContent') {
    var r = await chapterContent('http://www.35ge.info/xs/412/412532/110101189.html');
    return { passed: r.length > 100, message: 'chapterContent len=' + r.length + ' first=' + r.substring(0, 40) };
  }

  return { passed: false, message: '未知测试类型: ' + type };
}

// ─── 配置 ────────────────────────────────────────────────────────────────

var BASE = 'http://www.35ge.info';

/** 章节 URL 正则：匹配 /数字/数字/数字.html */
var CHAPTER_URL_PATTERN = /\/\d+\/\d+\/\d+\.html/;

// ─── 工具 ────────────────────────────────────────────────────────────────

function toAbs(href) {
  if (!href) return '';
  if (href.indexOf('http') === 0) return href;
  return BASE + (href.charAt(0) === '/' ? href : '/' + href);
}

// ─── 搜索 ─────────────────────────────────────────────────────────────────

async function search(keyword, page) {
  legado.log('[search] keyword=' + keyword);

  var url = BASE + '/modules/article/search.php?searchkey=' + encodeURIComponent(keyword);
  var html = await legado.http.get(url);

  var doc = legado.dom.parse(html);
  var books = [];

  // 搜索结果在 .novelslist2 表格中，每行一本书
  // 表头 li[0] 需跳过，数据行从 li[1] 开始
  var items = legado.dom.selectAll(doc, '.novelslist2 ul li');
  for (var i = 0; i < items.length; i++) {
    var el = items[i];

    // .s2 内含书名链接
    var bookUrl = legado.dom.selectAttr(el, '.s2 a', 'href');
    if (!bookUrl) continue;
    bookUrl = toAbs(bookUrl);

    var name = legado.dom.selectText(el, '.s2 a');
    if (!name) continue;

    var author = (legado.dom.selectText(el, '.s4') || '').trim();
    var kind = (legado.dom.selectText(el, '.s1') || '').trim();
    var lastChapter = (legado.dom.selectText(el, '.s3 a') || legado.dom.selectText(el, '.s3') || '').trim();

    books.push({
      name: name,
      author: author,
      bookUrl: bookUrl,
      coverUrl: '',
      lastChapter: lastChapter,
      kind: kind,
    });
  }

  legado.dom.free(doc);
  legado.log('[search] found=' + books.length);
  return books;
}

// ─── 书籍详情 ─────────────────────────────────────────────────────────────

async function bookInfo(bookUrl) {
  legado.log('[bookInfo] url=' + bookUrl);
  var html = await legado.http.get(bookUrl);
  var doc = legado.dom.parse(html);

  var result = {
    name:        legado.dom.selectAttr(doc, '[property="og:title"]', 'content')
              || legado.dom.selectAttr(doc, '[property="og:novel:book_name"]', 'content') || '',
    author:      legado.dom.selectAttr(doc, '[property="og:novel:author"]', 'content') || '',
    coverUrl:    legado.dom.selectAttr(doc, '[property="og:image"]', 'content') || '',
    intro:       legado.dom.selectAttr(doc, '[property="og:description"]', 'content') || '',
    lastChapter: legado.dom.selectAttr(doc, '[property="og:novel:latest_chapter_name"]', 'content')
              || legado.dom.selectAttr(doc, '[property="og:novel:lastest_chapter_name"]', 'content')
              || '',
    kind:        legado.dom.selectAttr(doc, '[property="og:novel:category"]', 'content') || '',
    tocUrl:      bookUrl,
  };

  legado.dom.free(doc);
  return result;
}

// ─── 章节列表 ─────────────────────────────────────────────────────────────

async function chapterList(tocUrl) {
  legado.log('[chapterList] url=' + tocUrl);
  var chapters = [];
  var seenUrls = {};

  var html = await legado.http.get(tocUrl);
  var doc = legado.dom.parse(html);

  // 章节链接在 #list dl dd a 中
  var links = legado.dom.selectAll(doc, '#list dd a');
  for (var i = 0; i < links.length; i++) {
    var href = legado.dom.attr(links[i], 'href') || '';
    if (!CHAPTER_URL_PATTERN.test(href)) continue;
    var chUrl = toAbs(href);
    var chName = (legado.dom.text(links[i]) || '').trim();
    if (chName && chUrl && !seenUrls[chUrl]) {
      seenUrls[chUrl] = 1;
      chapters.push({ name: chName, url: chUrl });
    }
  }

  legado.dom.free(doc);
  legado.log('[chapterList] total=' + chapters.length);
  return chapters;
}

// ─── 正文 ─────────────────────────────────────────────────────────────────

async function chapterContent(chapterUrl) {
  legado.log('[content] url=' + chapterUrl);

  var html = await legado.http.get(chapterUrl);
  var doc = legado.dom.parse(html);

  var contentEl = legado.dom.select(doc, '#content');
  if (!contentEl) {
    legado.dom.free(doc);
    legado.log('[content] #content not found');
    return '';
  }

  // 获取正文 HTML 并按 <br> 分段
  var contentHtml = legado.dom.html(contentEl) || '';
  legado.dom.free(doc);

  var lines = contentHtml.split(/<br\s*\/?>|<\/?p[^>]*>/i);
  var paragraphs = [];
  for (var i = 0; i < lines.length; i++) {
    var text = lines[i].replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
    if (text && !/本章未完|加入书签|章节报错|35中文网|35ge\.info/.test(text)) {
      paragraphs.push(text);
    }
  }

  return paragraphs.join('\n\n');
}

// ─── 发现页 ──────────────────────────────────────────────────────────────

var EXPLORE_CATEGORIES = [
  { name: '玄幻魔法', path: '/xs/1-default-0-0-0-0-0-0-1.html' },
  { name: '武侠修真', path: '/xs/2-default-0-0-0-0-0-0-1.html' },
  { name: '都市言情', path: '/xs/3-default-0-0-0-0-0-0-1.html' },
  { name: '历史军事', path: '/xs/4-default-0-0-0-0-0-0-1.html' },
  { name: '游戏竞技', path: '/xs/5-default-0-0-0-0-0-0-1.html' },
  { name: '科幻恐怖', path: '/xs/6-default-0-0-0-0-0-0-1.html' },
  { name: '其他类型', path: '/xs/7-default-0-0-0-0-0-0-1.html' },
  { name: '完本小说', path: '/xs/0-default-0-0-0-0-2-0-1.html' },
];

async function explore(page, category) {
  var cat = null;
  for (var i = 0; i < EXPLORE_CATEGORIES.length; i++) {
    if (EXPLORE_CATEGORIES[i].name === category) {
      cat = EXPLORE_CATEGORIES[i];
      break;
    }
  }
  if (!cat) return EXPLORE_CATEGORIES.map(function(c) { return c.name; });

  var url = BASE + cat.path;
  var html = await legado.http.get(url);
  var doc = legado.dom.parse(html);
  var books = [];

  var items = legado.dom.selectAll(doc, '#newscontent .l ul li');
  for (var i = 0; i < items.length; i++) {
    var el = items[i];
    var bookUrl = legado.dom.selectAttr(el, '.s2 a', 'href');
    if (!bookUrl) continue;
    bookUrl = toAbs(bookUrl);

    var name = legado.dom.selectText(el, '.s2 a');
    if (!name) continue;

    var author = (legado.dom.selectText(el, '.s4') || '').trim();

    books.push({
      name: name,
      author: author,
      bookUrl: bookUrl,
      coverUrl: '',
    });
  }

  legado.dom.free(doc);
  return books;
}
