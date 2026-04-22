// @name        126小说网
// @version     1.0.0
// @author      Legado Tauri
// @url         https://www.tatays.com
// @logo        https://www.tatays.com/favicon.ico
// @enabled true
// @tags        免费,小说,免费小说
// @description 126小说网（tatays.com），免费网文小说站。

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
    var books = await explore(1, '玄幻奇幻');
    if (!books || books.length < 1) return { passed: false, message: '发现页 [玄幻奇幻] 返回为空' };
    return { passed: true, message: '发现页 [玄幻奇幻]: ' + books.length + ' 条结果 ✓' };
  }

  if (type === 'bookInfo') {
    var r = await bookInfo('https://www.tatays.com/book/109/');
    return { passed: !!r.name, message: 'bookInfo name=' + r.name + ' author=' + r.author };
  }

  if (type === 'chapterList') {
    var r = await chapterList('https://www.tatays.com/book/109/');
    return { passed: r.length > 0, message: 'chapterList cnt=' + r.length + ' first=' + (r[0] ? r[0].name : 'N/A') };
  }

  if (type === 'chapterContent') {
    var r = await chapterContent('https://www.tatays.com/book/109/224613.html');
    return { passed: r.length > 100, message: 'chapterContent len=' + r.length + ' first=' + r.substring(0, 40) };
  }

  return { passed: false, message: '未知测试类型: ' + type };
}

// ─── 配置 ────────────────────────────────────────────────────────────────

var BASE = 'https://www.tatays.com';

/** 章节 URL 正则：匹配 /book/数字_数字.html 或 /read/数字_数字.html */
var CHAPTER_URL_PATTERN = /\/(book|read)\/\d+_\d+\.html/;

// ─── 工具 ────────────────────────────────────────────────────────────────

function toAbs(href) {
  if (!href) return '';
  if (href.indexOf('http') === 0) return href;
  return BASE + (href.charAt(0) === '/' ? href : '/' + href);
}

function extractCover(el, selector) {
  return legado.dom.selectAttr(el, selector, 'data-src')
      || legado.dom.selectAttr(el, selector, 'data-original')
      || legado.dom.selectAttr(el, selector, 'src')
      || '';
}

// ─── 搜索 ─────────────────────────────────────────────────────────────────

async function search(keyword, page) {
  legado.log('[search] keyword=' + keyword);

  // 126小说网搜索使用 POST
  var url = BASE + '/modules/article/search.php';
  var body = 'searchtype=all&searchkey=' + encodeURIComponent(keyword);
  var html = await legado.http.post(url, body, {
    'Content-Type': 'application/x-www-form-urlencoded',
  });
  var doc = legado.dom.parse(html);
  var books = [];

  // 搜索结果在 .sort-list.search_words li 中（跳过第一个表头行）
  var items = legado.dom.selectAll(doc, '.sort-list.search_words li');
  for (var i = 1; i < items.length; i++) {
    var el = items[i];

    var bookUrl = legado.dom.selectAttr(el, '.one a', 'href');
    if (!bookUrl) continue;
    bookUrl = toAbs(bookUrl);

    var name = legado.dom.selectText(el, '.one a');
    if (!name) continue;

    var author = (legado.dom.selectText(el, '.three') || '').trim();
    var lastChapter = legado.dom.selectText(el, '.two a') || '';

    books.push({
      name: name,
      author: author,
      bookUrl: bookUrl,
      coverUrl: '',
      lastChapter: lastChapter,
      kind: '',
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

  var name = legado.dom.selectText(doc, '.chapter-list-info h1, .chapter-list-info h2')
          || legado.dom.selectText(doc, 'h1') || '';
  var coverUrl = extractCover(doc, '.chapter-img img');
  var intro = legado.dom.selectText(doc, '.info .intro') || '';

  // 详情信息在 .mid .clearfix dd 中
  var author = '';
  var kind = '';
  var ddEls = legado.dom.selectAll(doc, '.mid .clearfix dd');
  if (ddEls) {
    for (var i = 0; i < ddEls.length; i++) {
      var ddText = (legado.dom.text(ddEls[i]) || '').trim();
      if (ddText.indexOf('作者') !== -1) {
        var am = ddText.match(/作者[：:]\s*(\S+)/);
        if (am) author = am[1];
      }
      if (ddText.indexOf('类型') !== -1) {
        kind = ddText.replace(/类型[：:]\s*/, '').trim();
      }
    }
  }

  var result = {
    name: name,
    author: author,
    coverUrl: coverUrl,
    intro: intro,
    lastChapter: '',
    kind: kind,
    tocUrl: bookUrl,
  };

  legado.dom.free(doc);
  return result;
}

// ─── 章节列表 ─────────────────────────────────────────────────────────────

async function chapterList(tocUrl) {
  legado.log('[chapterList] url=' + tocUrl);
  var chapters = [];
  var seenUrls = {};
  var url = tocUrl;
  var MAX_PAGES = 30;

  for (var p = 0; p < MAX_PAGES; p++) {
    var html = await legado.http.get(url);
    var doc = legado.dom.parse(html);

    // 章节在 .chapter-box .chapter-list.clears ul li a 中
    var links = legado.dom.selectAll(doc, '.chapter-box .chapter-list.clears a');
    if (!links || links.length === 0) {
      // 备用选择器
      links = legado.dom.selectAll(doc, '.chapter-list a');
    }
    for (var i = 0; i < links.length; i++) {
      var href = legado.dom.attr(links[i], 'href') || '';
      if (!href || href.indexOf('javascript') !== -1) continue;
      var chUrl = toAbs(href);
      var chName = (legado.dom.text(links[i]) || '').trim();
      if (chName && chUrl && !seenUrls[chUrl]) {
        seenUrls[chUrl] = 1;
        chapters.push({ name: chName, url: chUrl });
      }
    }

    // 翻页
    var nextLink = legado.dom.selectByText(doc, '下一页');
    var nextHref = nextLink ? (legado.dom.attr(nextLink, 'href') || '') : '';
    legado.dom.free(doc);

    if (!nextHref || nextHref.indexOf('javascript') !== -1) break;
    var nextUrl = toAbs(nextHref);
    if (nextUrl === url) break;
    url = nextUrl;
  }

  legado.log('[chapterList] total=' + chapters.length);
  return chapters;
}

// ─── 正文 ─────────────────────────────────────────────────────────────────

async function chapterContent(chapterUrl) {
  legado.log('[content] url=' + chapterUrl);

  var html = await legado.http.get(chapterUrl);
  var doc = legado.dom.parse(html);

  var contentEl = legado.dom.select(doc, '.chapter-content');
  if (!contentEl) {
    contentEl = legado.dom.select(doc, '.content-box .chapter-content');
  }
  if (!contentEl) {
    legado.dom.free(doc);
    legado.log('[content] .chapter-content not found');
    return '';
  }

  var contentHtml = legado.dom.html(contentEl) || '';
  legado.dom.free(doc);

  var lines = contentHtml.split(/<br\s*\/?>|<\/?p[^>]*>/i);
  var paragraphs = [];
  for (var i = 0; i < lines.length; i++) {
    var text = lines[i].replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
    if (text && !/本章未完|加入书签|章节报错|126小说|tatays/.test(text)) {
      paragraphs.push(text);
    }
  }

  return paragraphs.join('\n\n');
}

// ─── 发现页 ──────────────────────────────────────────────────────────────

var EXPLORE_CATEGORIES = [
  { name: '玄幻奇幻', path: '/xuanhuan/p1.html' },
  { name: '武侠修真', path: '/wuxia/p1.html' },
  { name: '都市言情', path: '/yanqing/p1.html' },
  { name: '历史军事', path: '/lishi/p1.html' },
  { name: '科幻小说', path: '/kehuan/p1.html' },
  { name: '网游小说', path: '/wangyou/p1.html' },
  { name: '女生小说', path: '/nvsheng/p1.html' },
  { name: '其他小说', path: '/qita/p1.html' },
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

  // 分类页用 .list-content .list-title li 结构
  var items = legado.dom.selectAll(doc, '.list-title li');
  for (var i = 0; i < items.length; i++) {
    var el = items[i];
    var bookUrl = legado.dom.selectAttr(el, 'a', 'href');
    if (!bookUrl) continue;
    bookUrl = toAbs(bookUrl);

    var name = legado.dom.selectText(el, 'h2');
    if (!name) continue;

    var coverUrl = extractCover(el, 'img');
    var author = legado.dom.selectText(el, 'p') || '';
    var authorM = author.match(/作者[：:]\s*(\S+)/);
    author = authorM ? authorM[1] : '';

    books.push({ name: name, author: author, bookUrl: bookUrl, coverUrl: coverUrl });
  }

  legado.dom.free(doc);
  return books;
}
