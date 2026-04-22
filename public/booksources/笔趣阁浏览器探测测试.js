// @name        笔趣阁浏览器探测测试
// @version     0.3.0
// @author      Legado Tauri
// @url         https://m.22biqu.net
// @logo        https://m.22biqu.net/favicon.ico
// @enabled true
// @tags        测试,浏览器探测,笔趣阁
// @description 基于“笔趣阁模板”的浏览器探测测试书源。页面解析全部在探测 WebView 内完成，返回结构化数据，不回传 HTML。

var BASE = "https://m.22biqu.net";
var SEARCH_URL = "/ss/?searchkey={keyword}&submit=";
var CHAPTER_URL_PATTERN_TEXT = "\\/biqu\\d+\\/\\d+\\.html";

var SESSION_ROLE = {
  list: "list",
  info: "info",
  toc: "toc",
  content: "content",
};

var BROWSER_OPTIONS = {
  visible: false,
  waitUntil: "load",
  timeoutSecs: 30,
};

var BROWSER_SESSIONS = {};

var EXPLORE_CATEGORIES = [
  { name: "总人气排行", path: "/rank/allvisit/" },
  { name: "月排行榜", path: "/rank/monthvisit/" },
  { name: "周排行榜", path: "/rank/weekvisit/" },
  { name: "收藏榜", path: "/rank/goodnum/" },
  { name: "玄幻魔法", path: "/fenlei/1_1.html" },
  { name: "武侠修真", path: "/fenlei/2_1.html" },
  { name: "都市言情", path: "/fenlei/3_1.html" },
  { name: "历史军事", path: "/fenlei/4_1.html" },
  { name: "游戏竞技", path: "/fenlei/5_1.html" },
  { name: "科幻灵异", path: "/fenlei/6_1.html" },
  { name: "女生耽美", path: "/fenlei/7_1.html" },
];

function init() {
  BROWSER_SESSIONS = {};
  legado.log("[browser.init] 笔趣阁浏览器探测测试上下文初始化");
}

function TEST(type) {
  if (type === "__list__") return ["browser", "search", "flow", "explore"];

  if (type === "browser") {
    var probe = browserSmokeTest();
    if (!probe || !probe.title) return { passed: false, message: "浏览器探测未返回 title" };
    if (!probe.url || probe.url.indexOf(BASE) !== 0) return { passed: false, message: "URL 异常: " + probe.url };
    return { passed: true, message: "浏览器探测正常: " + probe.title + " / " + probe.readyState };
  }

  if (type === "search") {
    var results = search("斗破苍穹", 1);
    if (!results || results.length < 1) return { passed: false, message: "搜索结果为空" };
    return { passed: true, message: "浏览器内解析搜索返回 " + results.length + " 条" };
  }

  if (type === "flow") {
    var list = search("斗破苍穹", 1);
    if (!list || list.length < 1) return { passed: false, message: "搜索为空，无法继续链路测试" };
    var target = list[list.length - 1];
    for (var i = 0; i < list.length; i++) {
      if (list[i].name === "斗破苍穹") {
        target = list[i];
        break;
      }
    }
    var info = bookInfo(target.bookUrl);
    if (!info || !info.name) return { passed: false, message: "详情为空: " + target.bookUrl };
    var chapters = chapterList(info.tocUrl || target.bookUrl);
    if (!chapters || chapters.length < 1) return { passed: false, message: "目录为空: " + target.bookUrl };
    var content = chapterContent(chapters[0].url);
    if (!content || content.length < 50) return { passed: false, message: "正文过短: " + chapters[0].url };
    return { passed: true, message: "链路正常: " + info.name + " / " + chapters.length + " 章 / 正文 " + content.length + " 字" };
  }

  if (type === "explore") {
    var books = explore(1, "总人气排行");
    if (!books || books.length < 1) return { passed: false, message: "发现页为空" };
    return { passed: true, message: "浏览器内解析发现页返回 " + books.length + " 条" };
  }

  return { passed: false, message: "未知测试类型: " + type };
}

function createBrowserSession(role) {
  var id = legado.browser.create({
    visible: BROWSER_OPTIONS.visible,
    timeoutSecs: BROWSER_OPTIONS.timeoutSecs,
  });
  BROWSER_SESSIONS[role] = id;
  legado.log("[browser.session] create role=" + role + " id=" + id);
  return id;
}

function getBrowserSession(role) {
  if (BROWSER_SESSIONS[role]) return BROWSER_SESSIONS[role];
  return createBrowserSession(role);
}

function recreateBrowserSession(role, oldId, reason) {
  legado.log("[browser.session] recreate role=" + role + " oldId=" + oldId + " reason=" + reason);
  if (oldId) {
    try {
      legado.browser.close(oldId);
    } catch (e) {
      // 窗口已被手动关闭时这里会失败，忽略后重建。
    }
  }
  delete BROWSER_SESSIONS[role];
  return createBrowserSession(role);
}

function evalInBrowserSession(id, url, code, waitUntil) {
  legado.browser.navigate(id, url, {
    waitUntil: waitUntil || BROWSER_OPTIONS.waitUntil,
    timeoutSecs: BROWSER_OPTIONS.timeoutSecs,
  });
  return legado.browser.eval(id, code, {
    timeoutSecs: BROWSER_OPTIONS.timeoutSecs,
  });
}

function browserRun(role, url, code, waitUntil) {
  var id = getBrowserSession(role);
  try {
    return evalInBrowserSession(id, url, code, waitUntil);
  } catch (e) {
    id = recreateBrowserSession(role, id, e);
    return evalInBrowserSession(id, url, code, waitUntil);
  }
}

function browserSmokeTest() {
  return browserRun(
    SESSION_ROLE.list,
    BASE + "/",
    [
      "return {",
      "  title: document.title,",
      "  readyState: document.readyState,",
      "  url: location.href,",
      "  cookie: document.cookie",
      "};",
    ].join("\n"),
    "load"
  );
}

function search(keyword, page) {
  legado.log("[browser.search] keyword=" + keyword + " page=" + page);
  var url = BASE + SEARCH_URL.replace("{keyword}", encodeURIComponent(keyword));
  return browserRun(
    SESSION_ROLE.list,
    url,
    [
      "function text(root, selector) {",
      "  var el = root.querySelector(selector);",
      "  return el ? (el.textContent || '').trim() : '';",
      "}",
      "function attr(root, selector, name) {",
      "  var el = root.querySelector(selector);",
      "  return el ? (el.getAttribute(name) || '') : '';",
      "}",
      "function abs(href) {",
      "  if (!href) return '';",
      "  try { return new URL(href, location.href).href; } catch (e) { return ''; }",
      "}",
      "function cover(root) {",
      "  var img = root.querySelector('img');",
      "  return img ? (img.getAttribute('data-src') || img.getAttribute('data-original') || img.getAttribute('src') || '') : '';",
      "}",
      "function parseInfo(raw) {",
      "  raw = raw || '';",
      "  var am = raw.match(/作者[：:]\\s*(\\S+)/);",
      "  var km = raw.match(/类型[：:]\\s*(\\S+)/);",
      "  return { author: am ? am[1] : '', kind: km ? km[1] : '' };",
      "}",
      "return Array.from(document.querySelectorAll('.bookbox')).map(function(el) {",
      "  var href = attr(el, 'a[href*=\"/biqu\"]', 'href');",
      "  var name = text(el, '.bookname a');",
      "  var info = parseInfo(text(el, '.author'));",
      "  return {",
      "    name: name,",
      "    author: info.author,",
      "    bookUrl: abs(href),",
      "    coverUrl: abs(cover(el)),",
      "    lastChapter: text(el, '.update a'),",
      "    kind: info.kind",
      "  };",
      "}).filter(function(book) { return book.name && book.bookUrl; });",
    ].join("\n"),
    "networkidle"
  );
}

function bookInfo(bookUrl) {
  legado.log("[browser.bookInfo] url=" + bookUrl);
  return browserRun(
    SESSION_ROLE.info,
    bookUrl,
    [
      "function meta(name) {",
      "  var el = document.querySelector('[property=\"' + name + '\"]');",
      "  return el ? (el.getAttribute('content') || '').trim() : '';",
      "}",
      "return {",
      "  name: meta('og:novel:book_name'),",
      "  author: meta('og:novel:author'),",
      "  coverUrl: meta('og:image'),",
      "  intro: meta('og:description'),",
      "  lastChapter: meta('og:novel:latest_chapter_name') || meta('og:novel:lastest_chapter_name'),",
      "  kind: meta('og:novel:category'),",
      "  tocUrl: location.href",
      "};",
    ].join("\n"),
    "load"
  );
}

function readChapterPage(url) {
  return browserRun(
    SESSION_ROLE.toc,
    url,
    [
      "var chapterPattern = new RegExp(" + JSON.stringify(CHAPTER_URL_PATTERN_TEXT) + ");",
      "function abs(href) {",
      "  if (!href) return '';",
      "  try { return new URL(href, location.href).href; } catch (e) { return ''; }",
      "}",
      "var chapters = Array.from(document.querySelectorAll('.directoryArea:not(#chapterlist) a')).map(function(a) {",
      "  var href = a.getAttribute('href') || '';",
      "  return { name: (a.textContent || '').trim(), url: abs(href), rawHref: href };",
      "}).filter(function(ch) { return ch.name && ch.url && chapterPattern.test(ch.rawHref); }).map(function(ch) {",
      "  return { name: ch.name, url: ch.url };",
      "});",
      "var pages = Array.from(document.querySelectorAll('#indexselect option')).map(function(opt) {",
      "  return abs(opt.getAttribute('value') || '');",
      "}).filter(function(url) { return !!url; });",
      "return { chapters: chapters, pages: pages };",
    ].join("\n"),
    "load"
  );
}

function chapterList(tocUrl) {
  legado.log("[browser.chapterList] url=" + tocUrl);
  var first = readChapterPage(tocUrl);
  var pages = first.pages && first.pages.length ? first.pages : [tocUrl];
  var chapters = [];
  var seen = {};
  var maxPages = Math.min(pages.length, 50);
  for (var p = 0; p < maxPages; p++) {
    var data = p === 0 && pages[p] === tocUrl ? first : readChapterPage(pages[p]);
    var list = data.chapters || [];
    for (var i = 0; i < list.length; i++) {
      if (!seen[list[i].url]) {
        seen[list[i].url] = 1;
        chapters.push(list[i]);
      }
    }
  }
  return chapters;
}

function readContentPage(url) {
  return browserRun(
    SESSION_ROLE.content,
    url,
    [
      "function abs(href) {",
      "  if (!href) return '';",
      "  try { return new URL(href, location.href).href; } catch (e) { return ''; }",
      "}",
      "var noise = /本章未完|加入书签|章节报错|点击下一页|笔趣阁/;",
      "var root = document.querySelector('#chaptercontent');",
      "var paragraphs = root ? Array.from(root.querySelectorAll('p')).map(function(p) {",
      "  return (p.textContent || '').trim();",
      "}).filter(function(t) { return t && !noise.test(t); }) : [];",
      "var next = document.querySelector('#pt_next');",
      "return {",
      "  text: paragraphs.join('\\n\\n'),",
      "  nextUrl: next ? abs(next.getAttribute('href') || '') : '',",
      "  nextText: next ? (next.textContent || '') : ''",
      "};",
    ].join("\n"),
    "load"
  );
}

function chapterContent(chapterUrl) {
  legado.log("[browser.chapterContent] url=" + chapterUrl);
  var parts = [];
  var url = chapterUrl;
  for (var i = 0; i < 10; i++) {
    var data = readContentPage(url);
    if (data.text) parts.push(data.text);
    if (!data.nextUrl || data.nextText.indexOf("下一页") === -1 || data.nextUrl === url) break;
    url = data.nextUrl;
  }
  return parts.join("\n\n");
}

function explore(page, category) {
  if (category === "GETALL") {
    var names = [];
    for (var i = 0; i < EXPLORE_CATEGORIES.length; i++) names.push(EXPLORE_CATEGORIES[i].name);
    return names;
  }

  var cat = null;
  for (var j = 0; j < EXPLORE_CATEGORIES.length; j++) {
    if (EXPLORE_CATEGORIES[j].name === category) {
      cat = EXPLORE_CATEGORIES[j];
      break;
    }
  }
  if (!cat) return [];

  return browserRun(
    SESSION_ROLE.list,
    BASE + cat.path,
    [
      "function text(root, selector) {",
      "  var el = root.querySelector(selector);",
      "  return el ? (el.textContent || '').trim() : '';",
      "}",
      "function attr(root, selector, name) {",
      "  var el = root.querySelector(selector);",
      "  return el ? (el.getAttribute(name) || '') : '';",
      "}",
      "function abs(href) {",
      "  if (!href) return '';",
      "  try { return new URL(href, location.href).href; } catch (e) { return ''; }",
      "}",
      "function cover(root) {",
      "  var img = root.querySelector('img');",
      "  return img ? (img.getAttribute('data-src') || img.getAttribute('data-original') || img.getAttribute('src') || '') : '';",
      "}",
      "function parseAuthor(raw) {",
      "  return (raw || '').replace(/作者[：:]\\s*/, '').replace(/\\s*[（(]\\d{4}[\\s\\S]*$/, '').trim();",
      "}",
      "var items = Array.from(document.querySelectorAll('.hot_sale'));",
      "if (!items.length) items = Array.from(document.querySelectorAll('.bookbox'));",
      "return items.map(function(el) {",
      "  var name = text(el, '.title') || text(el, 'h4') || text(el, '.bookname a');",
      "  name = name.replace(/^\\d+\\./, '').trim();",
      "  var href = attr(el, 'a[href*=\"/biqu\"]', 'href');",
      "  return {",
      "    name: name,",
      "    author: parseAuthor(text(el, '.author')),",
      "    bookUrl: abs(href),",
      "    coverUrl: abs(cover(el)),",
      "    lastChapter: text(el, '.update a'),",
      "    kind: ''",
      "  };",
      "}).filter(function(book) { return book.name && book.bookUrl; });",
    ].join("\n"),
    "networkidle"
  );
}
