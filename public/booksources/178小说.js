// @name        178小说
// @version     2.0.0
// @author      Legado Tauri
// @url         https://www.178xs.cc
// @logo        https://www.178xs.cc/favicon.ico
// @enabled     true
// @tags        免费,小说,免费小说,GBK
// @description 178小说网（178xs.cc），免费网文小说，GBK 编码站点，以玄幻/都市题材为主。

// ─── 内置测试 ─────────────────────────────────────────────────────────────

async function TEST(type) {
  if (type === '__list__') return ['search', 'explore', 'bookInfo', 'chapterList', 'chapterContent'];

  if (type === 'search') {
    var results = await search('斗破', 1);
    if (!results || results.length < 1) return { passed: false, message: '搜索结果为空' };
    return { passed: true, message: '搜索"斗破"返回 ' + results.length + ' 条结果 ✓' };
  }

  if (type === 'explore') {
    var books = await explore(1, '玄幻小说');
    if (!books || books.length < 1 || typeof books[0] === 'string') return { passed: false, message: '发现页 [玄幻小说] 返回为空或格式错误' };
    return { passed: true, message: '发现页 [玄幻小说]: ' + books.length + ' 条结果 ✓' };
  }

  if (type === 'bookInfo') {
    var r = await bookInfo('https://www.178xs.cc/book_17394/');
    return { passed: !!r.name, message: 'bookInfo name=' + r.name };
  }

  if (type === 'chapterList') {
    var r = await chapterList('https://www.178xs.cc/book_17394/');
    return { passed: r.length > 0, message: 'chapterList cnt=' + r.length + ' first=' + (r[0] ? r[0].name : 'N/A') };
  }

  if (type === 'chapterContent') {
    var r = await chapterContent('https://www.178xs.cc/book_17394/5093294.html');
    return { passed: r.length > 100, message: 'chapterContent len=' + r.length + ' first=' + r.substring(0, 40) };
  }

  return { passed: false, message: '未知测试类型: ' + type };
}

// ─── 配置 ────────────────────────────────────────────────────────────────

var BASE = 'https://www.178xs.cc';

/** 章节 URL 正则（匹配相对路径 "5831.html" 或绝对路径 "/book_15/5831.html"） */
var CHAPTER_URL_PATTERN = /(?:\/book_\d+\/)?\d+(?:_\d+)?\.html/;

// ─── 工具 ────────────────────────────────────────────────────────────────

function toAbs(href) {
  if (!href) return '';
  if (href.indexOf('http') === 0) return href;
  return BASE + (href.charAt(0) === '/' ? href : '/' + href);
}

/** 将相对 href 解析为绝对 URL（基于 baseUrl 的目录） */
function resolveUrl(href, baseUrl) {
  if (!href) return '';
  if (href.indexOf('http') === 0) return href;
  if (href.charAt(0) === '/') return BASE + href;
  // 相对路径：取 baseUrl 的目录部分
  var dir = baseUrl.replace(/[^\/]*$/, '');
  return dir + href;
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

  // 178xs 使用 GBK 编码，需要对关键词进行 GBK percent-encoding
  var encodedKeyword = legado.urlEncodeCharset(keyword, 'gbk');
  var url = BASE + '/modules/article/search.php?searchkey=' + encodedKeyword;
  var html = await legado.http.get(url);
  var doc = legado.dom.parse(html);
  var books = [];

  var items = legado.dom.selectAll(doc, '.bookbox');
  for (var i = 0; i < items.length; i++) {
    var el = items[i];

    // 书名和链接
    var bookUrl = legado.dom.selectAttr(el, 'h4.bookname a', 'href');
    if (!bookUrl) continue;
    // 178xs 搜索页链接使用 /go/ 前缀，需替换为 /book_
    if (bookUrl.indexOf('/go/') !== -1) {
      bookUrl = bookUrl.replace('/go/', '/book_');
    }
    bookUrl = toAbs(bookUrl);

    var name = legado.dom.selectText(el, 'h4.bookname a');
    if (!name) continue;

    var author = (legado.dom.selectText(el, '.author') || '').replace(/^作者[：:]/, '').trim();
    var lastChapter = legado.dom.selectText(el, '.cat a') || '';
    var intro = (legado.dom.selectText(el, '.update') || '').replace(/^简介[：:]/, '').trim();

    books.push({
      name: name,
      author: author,
      bookUrl: bookUrl,
      lastChapter: lastChapter,
      intro: intro,
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
    name:        legado.dom.selectAttr(doc, '[property="og:novel:book_name"]', 'content') || '',
    author:      legado.dom.selectAttr(doc, '[property="og:novel:author"]', 'content') || '',
    coverUrl:    legado.dom.selectAttr(doc, '[property="og:image"]', 'content') || '',
    intro:       legado.dom.selectText(doc, 'p.bookintro') || legado.dom.selectAttr(doc, '[property="og:description"]', 'content') || '',
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

  // 178xs 章节在 #list-chapterAll dd a 中，单页不分页
  var links = legado.dom.selectAll(doc, '#list-chapterAll dd a');
  for (var i = 0; i < links.length; i++) {
    var href = legado.dom.attr(links[i], 'href') || '';
    if (!CHAPTER_URL_PATTERN.test(href)) continue;
    var chUrl = resolveUrl(href, tocUrl);
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
  var paragraphs = [];
  var url = chapterUrl;
  var MAX_PAGES = 10;

  for (var p = 0; p < MAX_PAGES; p++) {
    var html = await legado.http.get(url);
    var doc = legado.dom.parse(html);

    var contentEl = legado.dom.select(doc, '.readcontent');
    if (!contentEl) {
      legado.dom.free(doc);
      legado.log('[content] readcontent not found at page ' + (p + 1));
      break;
    }

    // 提取文本节点（.readcontent 直接包含文本，不一定有<p>标签）
    var contentHtml = legado.dom.html(contentEl) || '';
    // 按 <br> 或 <p> 分段
    var lines = contentHtml.split(/<br\s*\/?>|<\/?p[^>]*>/i);
    for (var i = 0; i < lines.length; i++) {
      // 去除 HTML 标签和 &nbsp;
      var text = lines[i].replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
      if (text && !/本章未完|加入书签|章节报错|点击下一页|178小说/.test(text)) {
        paragraphs.push(text);
      }
    }

    // 翻页
    var nextLink = legado.dom.selectByText(doc, '下一页');
    var nextHref = nextLink ? (legado.dom.attr(nextLink, 'href') || '') : '';
    legado.dom.free(doc);

    if (!nextHref || nextHref.indexOf('javascript') !== -1) break;
    var nextUrl = resolveUrl(nextHref, url);
    if (nextUrl === url) break;
    url = nextUrl;
  }

  return paragraphs.join('\n\n');
}

// ─── 发现页 ──────────────────────────────────────────────────────────────

var EXPLORE_CATEGORIES = [
  { name: '全部小说',   path: '/all.html' },
  { name: '玄幻小说',   path: '/xuanhuan.html' },
  { name: '仙侠小说',   path: '/xianxia.html' },
  { name: '都市小说',   path: '/dushi.html' },
  { name: '军史小说',   path: '/junshi.html' },
  { name: '网游小说',   path: '/wangyou.html' },
  { name: '科幻小说',   path: '/kehuan.html' },
  { name: '灵异小说',   path: '/lingyi.html' },
  { name: '言情小说',   path: '/yanqing.html' },
  { name: '其他小说',   path: '/qita.html' },
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

  var items = legado.dom.selectAll(doc, '.bookbox');
  for (var i = 0; i < items.length; i++) {
    var el = items[i];
    var bookUrl = legado.dom.selectAttr(el, 'a', 'href');
    if (!bookUrl) continue;
    bookUrl = toAbs(bookUrl);

    var name = legado.dom.selectText(el, 'h4');
    if (!name) continue;

    var coverUrl = extractCover(el, 'img');
    var authorEls = legado.dom.selectAll(el, '.author');
    var author = '';
    if (authorEls && authorEls.length > 0) {
      author = (legado.dom.text(authorEls[0]) || '').trim();
    }

    books.push({
      name: name,
      author: author,
      bookUrl: bookUrl,
      coverUrl: coverUrl,
    });
  }

  legado.dom.free(doc);
  return books;
}
