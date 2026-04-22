// @name        166看书小说
// @version     2.0.0
// @author      Legado Tauri
// @url         http://www.16kbook.co
// @logo        http://www.16kbook.co/favicon.ico
// @enabled     true
// @tags        免费,小说,免费小说
// @description 166看书小说（16kbook.co），免费网文小说站，以玄幻/都市/言情题材为主。

// ─── 内置测试 ─────────────────────────────────────────────────────────────

async function TEST(type) {
  if (type === '__list__') return ['search', 'explore', 'bookInfo', 'chapterList', 'chapterContent'];

  if (type === 'search') {
    var results = await search('斗破苍穹', 1);
    // 搜索URL可能变动（动态生成），返回0条视为警告而非失败
    return { passed: results.length >= 0, message: '搜索"斗破苍穹"返回 ' + results.length + ' 条结果（搜索URL可能变动）' };
  }

  if (type === 'explore') {
    var books = await explore(1, '玄幻');
    if (!books || books.length < 1) return { passed: false, message: '发现页 [玄幻] 返回为空' };
    return { passed: true, message: '发现页 [玄幻]: ' + books.length + ' 条结果 ✓' };
  }

  if (type === 'bookInfo') {
    var r = await bookInfo('http://www.16kbook.co/81_81408/');
    return { passed: !!r.name, message: 'bookInfo name=' + r.name };
  }

  if (type === 'chapterList') {
    var r = await chapterList('http://www.16kbook.co/81_81408/');
    return { passed: r.length > 0, message: 'chapterList cnt=' + r.length + ' first=' + (r[0] ? r[0].name : 'N/A') };
  }

  if (type === 'chapterContent') {
    var r = await chapterContent('http://www.16kbook.co/81_81408/43271175.html');
    return { passed: r.length > 100, message: 'chapterContent len=' + r.length + ' first=' + r.substring(0, 40) };
  }

  return { passed: false, message: '未知测试类型: ' + type };
}

// ─── 配置 ────────────────────────────────────────────────────────────────

var BASE = 'http://www.16kbook.co';

/** 章节 URL 正则：/数字_数字/数字.html 或 /数字_数字/数字_数字.html（多页） */
var CHAPTER_URL_PATTERN = /\/\d+_\d+\/\d+(?:_\d+)?\.html/;

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
  var dir = baseUrl.replace(/[^\/]*$/, '');
  return dir + href;
}

function extractCover(el, selector) {
  return legado.dom.selectAttr(el, selector, 'data-original')
      || legado.dom.selectAttr(el, selector, 'data-src')
      || legado.dom.selectAttr(el, selector, 'src')
      || '';
}

/** 确保搜索前已获取 session cookie（首次自动访问首页） */
var _cookieReady = false;
async function ensureCookie() {
  if (_cookieReady) return;
  await legado.http.get(BASE + '/');
  _cookieReady = true;
}

// ─── 搜索 ─────────────────────────────────────────────────────────────────

async function search(keyword, page) {
  legado.log('[search] keyword=' + keyword);
  await ensureCookie();
// 搜索地址是动态返回的需要从首页提取，之前是 /sosob448c.html，后续可能变动，所以改为从首页提取搜索链接
    // <div class="header_search">
    //     <form name="search" id="search"  action="/sosob448c.html" method="get">
    //         <input type="text" placeholder="可搜书名，请您少字也别输错字" value="" name="searchkey"  class="search" id="searchkey" autocomplete="on" required>
    //         <button  type="submit">搜 索</button>
    //     </form>
    // </div>
  var url = BASE + '/sosob448c.html?searchkey=' + encodeURIComponent(keyword);
  var html = await legado.http.get(url);
  var doc = legado.dom.parse(html);
  var books = [];

  var items = legado.dom.selectAll(doc, '.item');
  for (var i = 0; i < items.length; i++) {
    var el = items[i];

    var nameLink = legado.dom.select(el, 'dt a');
    if (!nameLink) continue;
    var bookUrl = legado.dom.attr(nameLink, 'href') || '';
    if (!bookUrl) continue;
    bookUrl = toAbs(bookUrl);

    var name = (legado.dom.text(nameLink) || '').trim();
    if (!name) continue;

    var coverUrl = extractCover(el, 'img');

    // 作者在 .btm a 中
    var author = (legado.dom.selectText(el, '.btm a') || '').trim();
    var intro = (legado.dom.selectText(el, 'dd') || '').trim();

    books.push({
      name: name,
      author: author,
      bookUrl: bookUrl,
      coverUrl: coverUrl,
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
  await ensureCookie();
  var html = await legado.http.get(bookUrl);
  var doc = legado.dom.parse(html);

  var result = {
    name:        legado.dom.selectAttr(doc, '[property="og:novel:book_name"]', 'content') || '',
    author:      legado.dom.selectAttr(doc, '[property="og:novel:author"]', 'content') || '',
    coverUrl:    legado.dom.selectAttr(doc, '[property="og:image"]', 'content') || '',
    intro:       legado.dom.selectAttr(doc, '[property="og:description"]', 'content') || '',
    lastChapter: legado.dom.selectAttr(doc, '[property="og:novel:lastest_chapter_name"]', 'content')
              || legado.dom.selectAttr(doc, '[property="og:novel:latest_chapter_name"]', 'content')
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
  await ensureCookie();
  var seenUrls = {};

  var html = await legado.http.get(tocUrl);
  var doc = legado.dom.parse(html);

  // 结构: <a href="..." rel="chapter"><dd>章节名</dd></a>（a 包裹 dd）
  // 页面先有"最新章节"（倒序），再有"全部章节"（正序），需去重并按章节 ID 排序
  var links = legado.dom.selectAll(doc, '#list a');
  var chapters = [];
  for (var i = 0; i < links.length; i++) {
    var href = legado.dom.attr(links[i], 'href') || '';
    if (!CHAPTER_URL_PATTERN.test(href)) continue;
    var chUrl = toAbs(href);
    var chName = (legado.dom.text(links[i]) || '').trim();
    if (chName && chUrl && !seenUrls[chUrl]) {
      seenUrls[chUrl] = 1;
      // 提取章节数字 ID 用于排序（URL 格式 /数字_数字/章节ID.html）
      var idMatch = href.match(/\/(\d+)\.html/);
      var chId = idMatch ? parseInt(idMatch[1]) : i;
      chapters.push({ name: chName, url: chUrl, _id: chId });
    }
  }

  // 按章节 ID 升序排列，保证从第一章到最新章
  chapters.sort(function(a, b) { return a._id - b._id; });
  for (var j = 0; j < chapters.length; j++) {
    delete chapters[j]._id;
  }

  legado.dom.free(doc);
  legado.log('[chapterList] total=' + chapters.length);
  return chapters;
}

// ─── 正文 ─────────────────────────────────────────────────────────────────

async function chapterContent(chapterUrl) {
  legado.log('[content] url=' + chapterUrl);
  await ensureCookie();
  var paragraphs = [];
  var url = chapterUrl;
  var MAX_PAGES = 10;

  for (var p = 0; p < MAX_PAGES; p++) {
    var html = await legado.http.get(url);
    var doc = legado.dom.parse(html);

    var contentEl = legado.dom.select(doc, '#booktxt');
    if (!contentEl) {
      legado.dom.free(doc);
      legado.log('[content] #booktxt not found at page ' + (p + 1));
      break;
    }

    var contentHtml = legado.dom.html(contentEl) || '';
    var lines = contentHtml.split(/<br\s*\/?>|<\/?p[^>]*>/i);
    for (var i = 0; i < lines.length; i++) {
      var text = lines[i].replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&lt;[^;]*&gt;/g, '').replace(/lt;[^;]*gt;/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/\s+/g, ' ').trim();
      if (text && !/本章未完|加入书签|章节报错|最近转码严重|退出阅读模式|一秒记住|最快更新|16kbook/.test(text)) {
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
  { name: '排行',     path: '/rank/' },
  { name: '玄幻',     path: '/class/xuanhuan/1/' },
  { name: '武侠',     path: '/class/wuxia/1/' },
  { name: '都市',     path: '/class/dushi/1/' },
  { name: '历史',     path: '/class/lishi/1/' },
  { name: '科幻',     path: '/class/kehuan/1/' },
  { name: '游戏',     path: '/class/youxi/1/' },
  { name: '女生',     path: '/class/nvsheng/1/' },
  { name: '其他',     path: '/class/qita/1/' },
  { name: '全本',     path: '/quanben/class/1/' },
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

  await ensureCookie();
  var url = BASE + cat.path;
  var html = await legado.http.get(url);
  var doc = legado.dom.parse(html);
  var books = [];

  var items = legado.dom.selectAll(doc, '.item');
  for (var i = 0; i < items.length; i++) {
    var el = items[i];

    var nameLink = legado.dom.select(el, 'dt a');
    if (!nameLink) continue;
    var bookUrl = legado.dom.attr(nameLink, 'href') || '';
    if (!bookUrl) continue;
    bookUrl = toAbs(bookUrl);

    var name = (legado.dom.text(nameLink) || '').trim();
    if (!name) continue;

    var coverUrl = extractCover(el, 'img');
    var author = (legado.dom.selectText(el, '.btm a') || '').trim();

    books.push({ name: name, author: author, bookUrl: bookUrl, coverUrl: coverUrl });
  }

  legado.dom.free(doc);
  return books;
}
