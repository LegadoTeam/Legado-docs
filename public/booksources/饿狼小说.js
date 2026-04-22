// @name 饿狼小说
// @version 1.0.0
// @author Cursor
// @url http://www.elkoparts.net
// @logo http://www.elkoparts.net/favicon.ico
// @enabled true
// @description 饿狼小说书源
// @host www.elkoparts.net
// @sort 1

var BASE_URL = "http://www.elkoparts.net";

var CATEGORIES = [
  { title: "玄幻奇幻", id: "1" },
  { title: "武侠仙侠", id: "2" },
  { title: "都市言情", id: "3" },
  { title: "历史军事", id: "4" },
  { title: "网游竞技", id: "5" },
  { title: "科幻灵异", id: "6" },
  { title: "女生频道", id: "7" }
];

function absoluteUrl(url) {
  if (!url) return "";
  if (url.indexOf("http://") === 0 || url.indexOf("https://") === 0) return url;
  if (url.charAt(0) === "/") return BASE_URL + url;
  return BASE_URL + "/" + url;
}

function cleanText(text) {
  if (!text) return "";
  return text.replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
}

function buildCoverFromBookUrl(bookUrl) {
  var m = String(bookUrl || "").match(/\/kanshu\/(\d+)\/(\d+)\/?$/);
  if (!m) return "";
  return BASE_URL + "/files/article/image/" + m[1] + "/" + m[2] + "/" + m[2] + "s.jpg";
}

function decodeHtml(text) {
  if (!text) return "";
  return text
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'");
}

function getBetween(source, start, end) {
  var i = source.indexOf(start);
  if (i < 0) return "";
  i += start.length;
  var j = source.indexOf(end, i);
  if (j < 0) return "";
  return source.substring(i, j);
}

async function fetchText(url) {
  // Android/Harmony 等端优先走宿主 http（更稳），必要时再回退 fetch
  if (typeof legado !== "undefined" && legado.http && typeof legado.http.get === "function") {
    return await legado.http.get(url);
  }
  var res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
  return await res.text();
}

function parseBookItemNode(node) {
  var name = cleanText(legado.dom.selectText(node, "dt a"));
  var bookUrl = absoluteUrl(legado.dom.selectAttr(node, "dt a", "href"));
  var author = cleanText(legado.dom.selectText(node, "dt span")).replace(/\s+$/, "");
  var intro = cleanText(legado.dom.selectText(node, "dd"));
  var cover = absoluteUrl(legado.dom.selectAttr(node, ".image img", "src"));
  return {
    name: name,
    author: author,
    bookUrl: bookUrl,
    coverUrl: cover,
    cover: cover,
    intro: intro
  };
}

async function search(keyword, page) {
  var url = BASE_URL + "/search.php?keyWord=" + encodeURIComponent(keyword || "");
  var html = await fetchText(url);
  var doc = legado.dom.parse(html);
  var items = legado.dom.selectAll(doc, ".txt-list.txt-list-row5 li");
  var books = [];

  for (var i = 0; i < items.length; i++) {
    var bookUrl = absoluteUrl(legado.dom.selectAttr(items[i], ".s2 a", "href"));
    if (!bookUrl) continue;
    var cover = buildCoverFromBookUrl(bookUrl);
    books.push({
      name: cleanText(legado.dom.selectText(items[i], ".s2 a")),
      author: cleanText(legado.dom.selectText(items[i], ".s4")),
      kind: cleanText(legado.dom.selectText(items[i], ".s1")).replace(/^\[|\]$/g, ""),
      latestChapter: cleanText(legado.dom.selectText(items[i], ".s3 a")),
      bookUrl: bookUrl,
      coverUrl: cover,
      cover: cover
    });
  }

  legado.dom.free(doc);
  return books;
}

async function bookInfo(bookUrl) {
  var url = absoluteUrl(bookUrl);
  var html = await fetchText(url);
  var doc = legado.dom.parse(html);

  var name = cleanText(legado.dom.selectText(doc, ".detail-box .info h1"));
  var author = cleanText(legado.dom.selectText(doc, ".detail-box .info p:nth-child(1)")).replace(/^作者：/, "");
  var kind = cleanText(legado.dom.selectText(doc, ".detail-box .info p:nth-child(2)")).replace(/^类别：/, "");
  var status = cleanText(legado.dom.selectText(doc, ".detail-box .info p:nth-child(3)")).replace(/^状态：/, "");
  var cover = absoluteUrl(legado.dom.selectAttr(doc, ".detail-box .imgbox img", "src"));
  var intro = cleanText(legado.dom.selectText(doc, ".detail-box .desc"));
  var latestChapter = cleanText(legado.dom.selectText(doc, ".detail-box .info p:last-child a"));
  var latestChapterUrl = absoluteUrl(legado.dom.selectAttr(doc, ".detail-box .info p:last-child a", "href"));
  var firstChapterUrl = absoluteUrl(legado.dom.selectAttr(doc, ".detail-box .info .btn-read", "href"));
  var firstFromToc = absoluteUrl(legado.dom.selectAttr(doc, ".row-section .layout-col1 .section-box:nth-of-type(2) .section-list a", "href"));

  if (!firstChapterUrl) firstChapterUrl = firstFromToc;
  if (!firstChapterUrl) {
    var parsed = parseChapterLinksFromHtml(html);
    if (parsed.length > 0) firstChapterUrl = parsed[0].url;
  }
  if (!firstChapterUrl) {
    firstChapterUrl = latestChapterUrl;
  }

  legado.dom.free(doc);

  return {
    name: name,
    author: author,
    kind: kind,
    status: status,
    coverUrl: cover,
    cover: cover,
    intro: intro,
    latestChapter: latestChapter,
    latestChapterUrl: latestChapterUrl,
    chapterUrl: firstChapterUrl,
    firstChapterUrl: firstChapterUrl,
    bookUrl: url,
    tocUrl: url
  };
}

function parseChapterLinksFromHtml(html) {
  var list = [];
  var block = "";
  var m = html.match(/<h2 class="layout-tit">[^<]*正文<\/h2>\s*<div class="section-box">([\s\S]*?)<\/div>\s*<div class="listpage">/);
  if (m && m[1]) {
    block = m[1];
  } else {
    var m2 = html.match(/<h2 class="layout-tit">[^<]*正文<\/h2>[\s\S]*?<\/div>\s*<\/div>/);
    block = m2 ? m2[0] : html;
  }

  var re = /<a[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g;
  var item;
  while ((item = re.exec(block)) !== null) {
    var href = absoluteUrl(item[1]);
    if (href.indexOf("/kanshu/") < 0 || href.indexOf(".html") < 0) continue;
    var title = cleanText(decodeHtml(item[2].replace(/<[^>]+>/g, "")));
    if (!title) continue;
    list.push({ title: title, url: href });
  }

  return list;
}

function parseTocPages(html, tocUrl) {
  var pages = [];
  var re = /<option\s+value="([^"]+)"[^>]*>/g;
  var m;
  var seen = {};

  pages.push(absoluteUrl(tocUrl));
  seen[absoluteUrl(tocUrl)] = true;

  while ((m = re.exec(html)) !== null) {
    var pageUrl = absoluteUrl(m[1]);
    if (!seen[pageUrl]) {
      seen[pageUrl] = true;
      pages.push(pageUrl);
    }
  }
  return pages;
}

async function chapterList(tocUrl) {
  var url = absoluteUrl(tocUrl);
  var firstHtml = await fetchText(url);
  var pages = parseTocPages(firstHtml, url);
  var chapters = [];
  var dedup = {};
  var htmlMap = {};

  htmlMap[url] = firstHtml;

  var pendingPages = [];
  for (var p = 0; p < pages.length; p++) {
    if (pages[p] !== url) pendingPages.push(pages[p]);
  }

  // 优先使用宿主批量请求，通常比 JS 层循环更快。
  var batchOk = false;
  if (legado && legado.http && typeof legado.http.batchGet === "function" && pendingPages.length > 0) {
    try {
      var batchRes = await legado.http.batchGet(pendingPages);
      if (batchRes && batchRes.length === pendingPages.length) {
        for (var b = 0; b < pendingPages.length; b++) {
          var item = batchRes[b];
          if (typeof item === "string") {
            htmlMap[pendingPages[b]] = item;
          } else if (item && typeof item.body === "string") {
            htmlMap[pendingPages[b]] = item.body;
          } else if (item && typeof item.data === "string") {
            htmlMap[pendingPages[b]] = item.data;
          }
        }
        batchOk = true;
      }
    } catch (e) {}
  }

  if (!batchOk) {
    // 回退：并发 worker 拉取。
    var maxWorkers = 16;
    var cursor = 0;
    async function worker() {
      while (true) {
        var idx = cursor;
        cursor += 1;
        if (idx >= pendingPages.length) break;
        var pageUrl = pendingPages[idx];
        if (!htmlMap[pageUrl]) {
          htmlMap[pageUrl] = await fetchText(pageUrl);
        }
      }
    }

    var jobs = [];
    for (var w = 0; w < maxWorkers; w++) {
      jobs.push(worker());
    }
    await Promise.all(jobs);
  }

  for (var i = 0; i < pages.length; i++) {
    var part = parseChapterLinksFromHtml(htmlMap[pages[i]] || "");
    for (var j = 0; j < part.length; j++) {
      if (dedup[part[j].url]) continue;
      dedup[part[j].url] = true;
      var u = absoluteUrl(part[j].url);
      chapters.push({
        name: part[j].title,
        url: u,
        chapterUrl: u,
        link: u
      });
    }
  }

  if (chapters.length > 0) {
    try {
      legado.log("[chapterList:first] " + JSON.stringify(chapters[0]));
    } catch (e) {}
  }

  return chapters;
}

function extractContent(html) {
  var raw = getBetween(html, '<div class="content" id="content">', '<script>read3();</script>');
  if (!raw) return "";
  raw = raw.replace(/<script[\s\S]*?<\/script>/g, "");
  raw = raw.replace(/<br\s*\/?>/gi, "\n");
  raw = raw.replace(/<\/p>/gi, "\n");
  raw = raw.replace(/<[^>]+>/g, "");
  raw = decodeHtml(raw);
  raw = raw.replace(/[ \t]+\n/g, "\n");
  raw = raw.replace(/\n{3,}/g, "\n\n");
  return raw.trim();
}

async function chapterContent(chapterUrl) {
  // 兼容不同运行时的传参：可能是字符串，也可能是对象({ chapterUrl/url/link })
  var raw = chapterUrl;
  if (raw && typeof raw === "object") {
    raw = raw.chapterUrl || raw.url || raw.link || "";
  }
  var url = absoluteUrl(raw || "");
  try {
    if (typeof legado !== "undefined" && legado.log) {
      legado.log("[chapterContent] input=" + String(raw || "") + ", url=" + url);
    }
  } catch (eLog) {}
  if (!url) return "";
  var html = await fetchText(url);

  // 参考 126小说网：DOM 定位正文容器 -> html() -> 按 br/p 切段
  try {
    if (typeof legado !== "undefined" && legado.dom && legado.dom.parse) {
      var doc = legado.dom.parse(html);
      var contentEl = legado.dom.select(doc, "#content");
      if (!contentEl) contentEl = legado.dom.select(doc, "div.content#content");
      if (!contentEl) contentEl = legado.dom.select(doc, "div.content");
      if (contentEl) {
        var contentHtml = legado.dom.html(contentEl) || "";
        legado.dom.free(doc);

        var lines = contentHtml.split(/<br\s*\/?>|<\/?p[^>]*>/i);
        var paragraphs = [];
        for (var i = 0; i < lines.length; i++) {
          var t = lines[i]
            .replace(/<script[\s\S]*?<\/script>/gi, "")
            .replace(/<style[\s\S]*?<\/style>/gi, "")
            .replace(/<[^>]+>/g, "");
          t = decodeHtml(t);
          t = t.replace(/\s+/g, " ").trim();
          if (!t) continue;
          if (/本章未完|加入书签|推荐本书|返回目录|最新网址|章节报错|下一章|上一章/.test(t)) continue;
          paragraphs.push(t);
        }
        return paragraphs.join("\n\n");
      }
      legado.dom.free(doc);
    }
  } catch (eDom) {}

  // 回退到旧的字符串截取方式
  return extractContent(html);
}

function getCategoryId(category) {
  if (!category) return "1";
  var val = String(category);
  for (var i = 0; i < CATEGORIES.length; i++) {
    if (CATEGORIES[i].id === val || CATEGORIES[i].title === val) return CATEGORIES[i].id;
  }
  return "1";
}

async function explore(page, category) {
  var getAllMode = category === "GETALL" || page === "GETALL";
  if (getAllMode) {
    var cats = [];
    for (var i = 0; i < CATEGORIES.length; i++) {
      cats.push(CATEGORIES[i].title);
    }
    return cats;
  }

  var p = parseInt(page || 1, 10);
  if (!p || p < 1) p = 1;
  var cateId = getCategoryId(category);
  var url = BASE_URL + "/ksl/" + cateId + "/" + p + ".html";
  var html = await fetchText(url);
  var doc = legado.dom.parse(html);
  var nodes = legado.dom.selectAll(doc, ".layout-col3 .item");
  var books = [];

  for (var j = 0; j < nodes.length; j++) {
    var item = parseBookItemNode(nodes[j]);
    if (item.bookUrl) books.push(item);
  }

  legado.dom.free(doc);
  return books;
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
    var r = await explore(1, '玄幻奇幻');
    return { passed: r.length > 0, message: 'explore cnt=' + r.length + ' first=' + (r[0] ? r[0].name : 'N/A') };
  }
  if (type === 'bookInfo') {
    var r = await bookInfo('http://www.elkoparts.net/kanshu/92/92836/');
    return { passed: !!r.name, message: 'bookInfo name=' + r.name + ' author=' + r.author };
  }
  if (type === 'chapterList') {
    var r = await chapterList('http://www.elkoparts.net/kanshu/92/92836/');
    return { passed: r.length > 0, message: 'chapterList cnt=' + r.length + ' first=' + (r[0] ? r[0].name : 'N/A') };
  }
  if (type === 'chapterContent') {
    var r = await chapterContent('http://www.elkoparts.net/kanshu/92/92836/39040522.html');
    return { passed: r.length > 100, message: 'chapterContent len=' + r.length + ' first=' + r.substring(0, 40) };
  }
}
