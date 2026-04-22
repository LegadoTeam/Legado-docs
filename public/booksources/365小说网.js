// @name        365小说网
// @version     1.0.0
// @author      Legado Tauri
// @url         http://www.shukuge.com
// @logo        http://www.shukuge.com/favicon.ico
// @enabled true
// @tags        免费,小说,免费小说
// @description 365小说网（shukuge.com），免费全本小说在线阅读站。

// ─── 内置测试 ─────────────────────────────────────────────────────────────

async function TEST(type) {
  if (type === '__list__') return ['search', 'explore'];

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
    var books = await explore(1, '玄幻');
    if (!books || books.length < 1) return { passed: false, message: '发现页 [玄幻] 返回为空' };
    return { passed: true, message: '发现页 [玄幻]: ' + books.length + ' 条结果 ✓' };
  }

  return { passed: false, message: '未知测试类型: ' + type };
}

// ─── 配置 ────────────────────────────────────────────────────────────────

var BASE = 'http://www.shukuge.com';

/** 章节 URL 正则：匹配 /book/数字/数字.html */
var CHAPTER_URL_PATTERN = /\/book\/\d+\/\d+\.html/;

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

  var url = BASE + '/Search?wd=' + encodeURIComponent(keyword);
  var html = await legado.http.get(url);
  var doc = legado.dom.parse(html);
  var books = [];

  // 搜索结果在 .listitem 中
  var items = legado.dom.selectAll(doc, '.listitem');
  for (var i = 0; i < items.length; i++) {
    var el = items[i];

    // 书名和链接
    var bookUrl = legado.dom.selectAttr(el, '.bookdesc a', 'href')
               || legado.dom.selectAttr(el, 'a', 'href');
    if (!bookUrl) continue;
    bookUrl = toAbs(bookUrl);

    var name = legado.dom.selectText(el, 'h2');
    if (!name) continue;

    var coverUrl = extractCover(el, 'img');

    // 作者和分类信息在 span 中
    var spans = legado.dom.selectAll(el, '.sp span');
    var author = '';
    var kind = '';
    if (spans && spans.length > 0) {
      author = (legado.dom.text(spans[0]) || '').replace(/作者[：:]\s*/, '').trim();
    }
    if (spans && spans.length > 1) {
      kind = (legado.dom.text(spans[1]) || '').replace(/分类[：:]\s*/, '').trim();
    }

    var lastChapter = legado.dom.selectText(el, '.desc a') || '';

    books.push({
      name: name,
      author: author,
      bookUrl: bookUrl,
      coverUrl: coverUrl,
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

  var name = legado.dom.selectAttr(doc, '.bookdcover img', 'alt') || '';
  var coverUrl = extractCover(doc, '.bookdcover img');
  var author = legado.dom.selectText(doc, '.bookdmore p:nth-child(3) a') || '';
  var intro = legado.dom.selectText(doc, '.bookdtext p') || '';
  // 过滤广告文字
  intro = intro.replace(/下载后请在24小时之内删除[\s\S]*/i, '').trim();

  var lastChapter = legado.dom.selectText(doc, '.bookdmore p:nth-child(7) a') || '';
  var kind = legado.dom.selectText(doc, '.bookdmore p:nth-child(1) a') || '';

  // 目录页链接：查找"在线阅读"按钮
  var tocUrl = legado.dom.selectAttr(doc, 'a.btn', 'href') || '';
  if (!tocUrl) {
    // 尝试通过文本查找
    var readLink = legado.dom.selectByText(doc, '在线阅读');
    tocUrl = readLink ? (legado.dom.attr(readLink, 'href') || '') : '';
  }
  tocUrl = tocUrl ? toAbs(tocUrl) : bookUrl;

  var result = {
    name: name,
    author: author,
    coverUrl: coverUrl,
    intro: intro,
    lastChapter: lastChapter,
    kind: kind,
    tocUrl: tocUrl,
  };

  legado.dom.free(doc);
  return result;
}

// ─── 章节列表 ─────────────────────────────────────────────────────────────

async function chapterList(tocUrl) {
  legado.log('[chapterList] url=' + tocUrl);
  var chapters = [];
  var seenUrls = {};

  // 365小说网目录可能分页，通过 <option> 枚举所有分页
  var html0 = await legado.http.get(tocUrl);
  var doc0 = legado.dom.parse(html0);
  var optVals = legado.dom.selectAllAttrs(doc0, 'option', 'value');
  legado.dom.free(doc0);

  if (optVals && optVals.length > 1) {
    // 分页模式
    legado.log('[chapterList] select mode, pages=' + optVals.length);
    var pageUrls = [];
    for (var p = 0; p < optVals.length && p < 50; p++) {
      pageUrls.push(toAbs(optVals[p]));
    }
    var batchResults = await legado.http.batchGet(pageUrls);
    for (var p = 0; p < batchResults.length; p++) {
      var res = batchResults[p];
      if (!res.ok) continue;
      var doc = legado.dom.parse(res.data);
      var links = legado.dom.selectAll(doc, 'dl dd a');
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
    }
  } else {
    // 单页模式或翻页模式
    var url = tocUrl;
    for (var p = 0; p < 50; p++) {
      var html = await legado.http.get(url);
      var doc = legado.dom.parse(html);
      var links = legado.dom.selectAll(doc, 'dl dd a');
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

      var nextLink = legado.dom.selectByText(doc, '下一页');
      var nextHref = nextLink ? (legado.dom.attr(nextLink, 'href') || '') : '';
      legado.dom.free(doc);

      if (!nextHref || nextHref.indexOf('javascript') !== -1) break;
      var nextUrl = toAbs(nextHref);
      if (nextUrl === url) break;
      url = nextUrl;
    }
  }

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

    // 365小说网正文在 #content > #content 嵌套中
    var contentEl = legado.dom.select(doc, '#content #content');
    if (!contentEl) {
      contentEl = legado.dom.select(doc, '#content');
    }
    if (!contentEl) {
      legado.dom.free(doc);
      legado.log('[content] #content not found at page ' + (p + 1));
      break;
    }

    var contentHtml = legado.dom.html(contentEl) || '';
    legado.dom.free(doc);

    var lines = contentHtml.split(/<br\s*\/?>|<\/?p[^>]*>/i);
    for (var i = 0; i < lines.length; i++) {
      var text = lines[i].replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
      if (text && !/本章未完|加入书签|章节报错|365小说网|shukuge\.com/.test(text)) {
        paragraphs.push(text);
      }
    }

    // 翻页
    var nextLink = legado.dom.selectByText(doc, '下一页');
    var nextHref = nextLink ? (legado.dom.attr(nextLink, 'href') || '') : '';
    if (!nextHref || nextHref.indexOf('javascript') !== -1) break;
    var nextUrl = toAbs(nextHref);
    if (nextUrl === url) break;
    url = nextUrl;
  }

  return paragraphs.join('\n\n');
}

// ─── 发现页 ──────────────────────────────────────────────────────────────

var EXPLORE_CATEGORIES = [
  { name: '玄幻',     path: '/i-xuanhuan/' },
  { name: '言情',     path: '/i-yanqing/' },
  { name: '穿越',     path: '/i-chuanyue/' },
  { name: '重生',     path: '/i-chongsheng/' },
  { name: '武侠',     path: '/i-wuxia/' },
  { name: '仙侠',     path: '/i-xianxia/' },
  { name: '都市',     path: '/i-dushi/' },
  { name: '军事',     path: '/i-junshi/' },
  { name: '科幻',     path: '/i-kehuan/' },
  { name: '最新小说', path: '/new/' },
  { name: '排行榜',   path: '/top/' },
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

  // 列表页结构类似搜索
  var items = legado.dom.selectAll(doc, '.listitem');
  for (var i = 0; i < items.length; i++) {
    var el = items[i];
    var bookUrl = legado.dom.selectAttr(el, 'a', 'href');
    if (!bookUrl) continue;
    bookUrl = toAbs(bookUrl);

    var name = legado.dom.selectText(el, 'h2')
            || legado.dom.selectText(el, 'h4')
            || legado.dom.selectText(el, 'a');
    if (!name) continue;

    var coverUrl = extractCover(el, 'img');
    books.push({ name: name, author: '', bookUrl: bookUrl, coverUrl: coverUrl });
  }

  legado.dom.free(doc);
  return books;
}
