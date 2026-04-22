// @name        速读谷
// @version     1.0.0
// @author      Cursor
// @url         http://www.sudugu.org/
// @logo        http://www.sudugu.org/favicon.ico
// @enabled     true
// @description 速读谷小说书源，支持搜索、详情、目录、正文、分类发现

var BASE = "http://www.sudugu.org";

var CATEGORIES = [
  { name: "玄幻", path: "/xuanhuan/" },
  { name: "仙侠", path: "/xianxia/" },
  { name: "都市", path: "/dushi/" },
  { name: "历史", path: "/lishi/" },
  { name: "军事", path: "/junshi/" },
  { name: "科幻", path: "/kehuan/" },
  { name: "言情", path: "/yanqing/" },
  { name: "轻小说", path: "/qing/" },
  { name: "诸天无限", path: "/zhutianwuxian/" },
  { name: "游戏", path: "/youxi/" },
  { name: "奇幻", path: "/qihuan/" },
  { name: "悬疑", path: "/xuanyi/" },
  { name: "体育", path: "/tiyu/" },
  { name: "官场", path: "/guanchang/" },
  { name: "武侠", path: "/wuxia/" },
  { name: "乡村", path: "/xiangcun/" },
  { name: "现实", path: "/xianshi/" }
];

function absUrl(url) {
  if (!url) return "";
  if (/^https?:\/\//i.test(url)) return url;
  if (url.charAt(0) === "/") return BASE + url;
  return BASE + "/" + url;
}

function normalizeText(s) {
  if (!s) return "";
  return s.replace(/\u00a0/g, " ").replace(/\s+/g, " ").replace(/^\s+|\s+$/g, "");
}

function trimAuthor(s) {
  return normalizeText((s || "").replace(/^作者[:：]\s*/, ""));
}

function cleanContent(s) {
  if (!s) return "";
  var text = s;
  text = text.replace(/本章未完，请点击下一页继续阅读。?/g, "");
  text = text.replace(/最新网址[:：]?.*$/gm, "");
  text = text.replace(/请收藏.*速读谷.*/g, "");
  text = text.replace(/^\s*(第[\s\u3000]*[0-9零一二三四五六七八九十百千万两〇]+[\s\u3000]*[章节回卷].*)\n+/i, "");
  text = text.replace(/\n*(本章完[。！!]*|（本章完）|\(本章完\)|章节报错.*|加入书签.*|返回书页.*)\s*$/i, "");
  text = text.replace(/\n{3,}/g, "\n\n");
  return text.replace(/^\s+|\s+$/g, "");
}

function parseBookItems(doc, kindFallback) {
  var items = legado.dom.selectAll(doc, ".container .item");
  var books = [];
  for (var i = 0; i < items.length; i++) {
    var el = items[i];
    var name = normalizeText(
      legado.dom.selectText(el, ".itemtxt h3 a") ||
      legado.dom.selectText(el, ".itemtxt h1 a")
    );
    var bookUrl = absUrl(
      legado.dom.selectAttr(el, ".itemtxt h3 a", "href") ||
      legado.dom.selectAttr(el, ".itemtxt h1 a", "href") ||
      legado.dom.selectAttr(el, "a", "href")
    );
    if (!name || !bookUrl) continue;

    var author = trimAuthor(
      legado.dom.selectText(el, ".itemtxt p:nth-of-type(2) a") ||
      legado.dom.selectText(el, ".itemtxt p a")
    );
    var coverUrl = absUrl(legado.dom.selectAttr(el, "img", "src"));
    var latestChapter = normalizeText(legado.dom.selectText(el, "ul li a"));
    var status = normalizeText(legado.dom.selectText(el, ".itemtxt p span:nth-child(1)"));
    var kind = normalizeText(legado.dom.selectText(el, ".itemtxt p span:nth-child(2)")) || kindFallback || "";

    books.push({
      name: name,
      bookUrl: bookUrl,
      author: author,
      coverUrl: coverUrl,
      latestChapter: latestChapter,
      kind: (status ? (status + " " + kind) : kind)
    });
  }
  return books;
}

async function search(keyword, page) {
  legado.log("[search] keyword=" + keyword + " page=" + page);
  var url = BASE + "/i/sor.aspx?key=" + encodeURIComponent(keyword) + "&p=" + page;
  var html = await legado.http.get(url);
  var doc = legado.dom.parse(html);
  var books = parseBookItems(doc, "");
  legado.dom.free(doc);
  legado.log("[search] found=" + books.length);
  return books;
}

async function bookInfo(bookUrl) {
  legado.log("[bookInfo] url=" + bookUrl);
  var realUrl = absUrl(bookUrl);
  var html = await legado.http.get(realUrl);
  var doc = legado.dom.parse(html);

  var status = normalizeText(legado.dom.selectText(doc, ".itemtxt p span:nth-child(1)"));
  var kindOnly = normalizeText(legado.dom.selectText(doc, ".itemtxt p span:nth-child(2)"));
  var latestChapter = normalizeText(legado.dom.selectText(doc, ".itemtxt ul li a"));

  var info = {
    name: normalizeText(legado.dom.selectText(doc, ".itemtxt h1 a") || legado.dom.selectText(doc, ".itemtxt h1")),
    author: trimAuthor(legado.dom.selectText(doc, ".itemtxt p:nth-of-type(2) a")),
    bookUrl: realUrl,
    tocUrl: realUrl,
    coverUrl: absUrl(legado.dom.selectAttr(doc, ".item img", "src")),
    intro: normalizeText(legado.dom.selectText(doc, ".container .des.bb")),
    latestChapter: latestChapter,
    kind: (status ? (status + " " + kindOnly) : kindOnly)
  };

  legado.dom.free(doc);
  return info;
}

async function chapterList(tocUrl) {
  legado.log("[chapterList] url=" + tocUrl);
  var chapters = [];
  var seen = {};
  var firstUrl = absUrl(tocUrl);
  var firstHtml = await legado.http.get(firstUrl);
  var firstDoc = legado.dom.parse(firstHtml);
  var pageLinks = legado.dom.selectAllAttrs(firstDoc, "#pages a, .pages a, .page a", "href");
  var pageOptions = legado.dom.selectAllAttrs(firstDoc, "#pageSelect option", "value");
  legado.dom.free(firstDoc);

  function appendFromHtml(html) {
    var doc = legado.dom.parse(html);
    var nodes = legado.dom.selectAll(doc, "#list a");
    for (var i = 0; i < nodes.length; i++) {
      var name = normalizeText(legado.dom.text(nodes[i]));
      var url = absUrl(legado.dom.attr(nodes[i], "href"));
      if (!name || !url || seen[url]) continue;
      seen[url] = true;
      chapters.push({ name: name, url: url });
    }
    legado.dom.free(doc);
  }

  appendFromHtml(firstHtml);

  // 识别目录分页并并发抓取，兼容 /book/p-2.html 与 /book/2.html 两类。
  var pageUrls = [];
  var pageSeen = {};
  pageSeen[firstUrl] = true;

  var root = firstUrl.replace(/#.*$/, "");
  var m = root.match(/^(https?:\/\/[^\/]+\/\d+\/)/i);
  var bookRoot = m ? m[1] : root.replace(/[^\/]*$/, "");
  var prefersPStyle = false;

  for (var i = 0; i < pageLinks.length; i++) {
    var p = absUrl(pageLinks[i]);
    if (!p || pageSeen[p]) continue;
    if (!/(\/p-\d+\.html|\/\d+\/\d+\.html)/i.test(p)) continue;
    if (/\/p-\d+\.html/i.test(p)) prefersPStyle = true;
    pageSeen[p] = true;
    pageUrls.push(p);
  }

  for (var j = 0; j < pageOptions.length; j++) {
    var v = normalizeText(pageOptions[j]);
    if (!/^\d+$/.test(v)) continue;
    var pageNum = parseInt(v, 10);
    if (isNaN(pageNum) || pageNum <= 1) continue;
    var optionUrl = prefersPStyle
      ? (bookRoot + "p-" + pageNum + ".html")
      : (bookRoot + pageNum + ".html");
    if (optionUrl && !pageSeen[optionUrl]) {
      pageSeen[optionUrl] = true;
      pageUrls.push(optionUrl);
    }
  }

  if (pageUrls.length > 0) {
    var results = await legado.http.batchGet(pageUrls);
    for (var k = 0; k < results.length; k++) {
      if (!results[k] || !results[k].ok || !results[k].data) continue;
      appendFromHtml(results[k].data);
    }
  }

  legado.log("[chapterList] count=" + chapters.length);
  return chapters;
}

async function chapterContent(chapterUrl) {
  legado.log("[chapterContent] url=" + chapterUrl);
  var MAX_PAGES = 20;
  var currentUrl = absUrl(chapterUrl);
  var visited = {};
  var parts = [];

  for (var p = 0; p < MAX_PAGES; p++) {
    if (visited[currentUrl]) break;
    visited[currentUrl] = true;

    var html = await legado.http.get(currentUrl);
    var doc = legado.dom.parse(html);

    var paragraphs = legado.dom.selectAllTexts(doc, ".con p");
    if (paragraphs && paragraphs.length > 0) {
      for (var i = 0; i < paragraphs.length; i++) {
        var line = normalizeText(paragraphs[i]);
        if (line) parts.push(line);
      }
    } else {
      var whole = normalizeText(legado.dom.selectText(doc, ".con"));
      if (whole) parts.push(whole);
    }

    var nextHref = legado.dom.selectAttr(doc, ".prenext span:last-child a", "href");
    legado.dom.free(doc);

    if (!nextHref) break;
    var nextUrl = absUrl(nextHref);
    if (/\/#dir$/.test(nextUrl) || nextUrl === currentUrl) break;
    if (!/-\d+\.html$/i.test(nextUrl)) break;
    currentUrl = nextUrl;
  }

  return cleanContent(parts.join("\n\n"));
}

async function TEST(type) {
  if (type === '__list__') {
    return ['search', 'explore', 'bookInfo', 'chapterList', 'chapterContent'];
  }
  if (type === 'search') {
    var r = await search('斗破苍穹', 1);
    return { passed: r.length > 0, message: 'search cnt=' + r.length + ' first=' + (r[0] ? r[0].name : 'N/A') };
  }
  if (type === 'explore') {
    var r = await explore(1, '玄幻');
    return { passed: r.length > 0, message: 'explore cnt=' + r.length + ' first=' + (r[0] ? r[0].name : 'N/A') };
  }
  if (type === 'bookInfo') {
    var r = await bookInfo('http://www.sudugu.org/448/');
    return { passed: !!r.name, message: 'bookInfo name=' + r.name + ' author=' + r.author };
  }
  if (type === 'chapterList') {
    var r = await chapterList('http://www.sudugu.org/448/');
    return { passed: r.length > 0, message: 'chapterList cnt=' + r.length + ' first=' + (r[0] ? r[0].name : 'N/A') };
  }
  if (type === 'chapterContent') {
    var r = await chapterContent('http://www.sudugu.org/448/640388.html');
    return { passed: r.length > 100, message: 'chapterContent len=' + r.length + ' first=' + r.substring(0, 40) };
  }
}

async function explore(page, category) {
  if (category === "GETALL") {
    var names = [];
    for (var i = 0; i < CATEGORIES.length; i++) names.push(CATEGORIES[i].name);
    return names;
  }

  legado.log("[explore] category=" + category + " page=" + page);

  var path = "";
  for (var i = 0; i < CATEGORIES.length; i++) {
    if (CATEGORIES[i].name === category) {
      path = CATEGORIES[i].path;
      break;
    }
  }
  if (!path) return [];

  var url = BASE + path;
  if (page > 1) {
    if (/\/$/.test(path)) {
      url = BASE + path + page + ".html";
    } else {
      url = BASE + path + "/" + page + ".html";
    }
  }

  var html = await legado.http.get(url);
  var doc = legado.dom.parse(html);
  var books = parseBookItems(doc, category);
  legado.dom.free(doc);
  return books;
}
