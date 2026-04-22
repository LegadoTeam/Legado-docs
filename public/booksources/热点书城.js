// @name        热点书城
// @version     1.0.0
// @author      Legado助手
// @url         https://m.rdrw8.com
// @type        novel
// @enabled     true
// @tags        小说,免费
// @description 热点书城小说书源，基于m站。支持Cloudflare验证。

var BASE = "https://m.rdrw8.com";

// ─── CF 保护检测 ────────────────────────────────────────────────────────

function isCfBlocked(html) {
  if (!html || html.length < 200) {
    legado.log("[CF] blocked: html too short");
    return true;
  }
  var markers = [
    "Just a moment",
    "cf-browser-verification",
    "Checking your browser",
    "cf-challenge-running",
    "managed_checking_msg",
    "cf-please-wait",
    "cf-turnstile-wrapper",
    "正在进行安全验证",
  ];
  for (var i = 0; i < markers.length; i++) {
    if (html.indexOf(markers[i]) !== -1) {
      legado.log("[CF] blocked: matched '" + markers[i] + "'");
      return true;
    }
  }
  return false;
}

// ─── CF 验证通过 ────────────────────────────────────────────────────────

function ensureCfPassed(url, html) {
  if (!isCfBlocked(html)) return html;

  legado.log("[CF] 检测到CF拦截，启动浏览器探测...");

  var sessionId = legado.browser.acquire("cf", { visible: false });
  legado.log("[CF] 会话 id=" + sessionId);

  legado.browser.navigate(sessionId, url, { waitFor: "load" });

  var maxAttempts = 60;
  var passed = false;
  var realHtml = null;
  var browserShown = false;

  for (var i = 0; i < maxAttempts; i++) {
    var pageHtml = legado.browser.html(sessionId);

    if (pageHtml && pageHtml.length > 500 && !isCfBlocked(pageHtml)) {
      passed = true;
      realHtml = pageHtml;
      legado.log("[CF] 验证通过 (尝试 " + (i + 1) + " 次)");
      break;
    }

    if (!browserShown) {
      legado.toast("需要完成CF验证，请在弹出窗口中操作");
      legado.browser.show(sessionId);
      browserShown = true;
    }

    legado.sleep(1000);
  }

  if (!passed) {
    legado.log("[CF] 验证超时");
    legado.browser.hide(sessionId);
    return html;
  }

  // 同步Cookie
  legado.browser.cookies(url);
  var httpCookies = legado.http.cookies(url);
  legado.log("[CF] Cookie已同步: " + httpCookies.substring(0, 100));

  legado.browser.hide(sessionId);
  return realHtml;
}

// ─── 工具函数 ──────────────────────────────────────────────────────────

function toAbs(href) {
  if (!href) return "";
  if (href.indexOf("http") === 0) return href;
  if (href.indexOf("//") === 0) return "https:" + href;
  if (href.indexOf("/") === 0) return BASE + href;
  return BASE + "/" + href;
}

// ─── 搜索 ──────────────────────────────────────────────────────────────

async function search(keyword, page) {
  var url = BASE + "/Search/" + encodeURIComponent(keyword);
  legado.log("[search] keyword=" + keyword + " url=" + url);

  var html = await legado.http.get(url);
  html = ensureCfPassed(url, html);

  var doc = legado.dom.parse(html);
  var blocks = legado.dom.selectAll(doc, "div.block");
  var books = [];

  for (var i = 0; i < blocks.length; i++) {
    var block = blocks[i];
    // 书名在 .block_txt p:first-child h2
    var name = legado.dom.selectText(block, "h2");
    if (!name) continue;
    // 链接在 .block_img a 或 .block_txt p a
    var href = legado.dom.selectAttr(block, ".block_img a", "href")
             || legado.dom.selectAttr(block, ".block_txt p a", "href")
             || "";
    if (!href) continue;
    // 作者：第二个 p 文本
    var authorPs = legado.dom.selectAll(block, ".block_txt p");
    var author = "";
    if (authorPs.length >= 2) {
      author = (legado.dom.text(authorPs[1]) || "").replace("作者：", "").replace(/[\r\n\t]/g, "").trim();
    }
    // 封面
    var coverUrl = toAbs(legado.dom.selectAttr(block, ".block_img img", "src") || "");
    books.push({
      name: name.replace(/[\r\n\t]/g, "").trim(),
      author: author,
      bookUrl: toAbs(href),
      coverUrl: coverUrl,
      kind: "",
      lastChapter: ""
    });
  }

  legado.dom.free(doc);
  legado.log("[search] 返回 " + books.length + " 条结果");
  return books;
}

// ─── 书籍详情 ─────────────────────────────────────────────────────────

async function bookInfo(bookUrl) {
  legado.log("[bookInfo] url=" + bookUrl);

  var html = await legado.http.get(bookUrl);
  html = ensureCfPassed(bookUrl, html);

  var doc = legado.dom.parse(html);

  // 书名：#xinxi ul 第一个 li 文本
  var liEls = legado.dom.selectAll(doc, "#xinxi .xx ul li");
  var name = liEls.length >= 1 ? (legado.dom.text(liEls[0]) || "").trim() : "";
  var kind = liEls.length >= 2 ? (legado.dom.text(liEls[1]) || "").replace("分类：", "").trim() : "";
  var author = liEls.length >= 3 ? (legado.dom.text(liEls[2]) || "").replace("作者：", "").trim() : "";
  var lastChapter = liEls.length >= 5 ? (legado.dom.selectText(liEls[4], "a") || "").trim() : "";

  // 封面
  var coverUrl = toAbs(legado.dom.selectAttr(doc, "#xinxi .xsfm img", "src") || "");

  // 简介
  var intro = (legado.dom.selectText(doc, ".jianjie") || "").trim();

  // 目录链接：.gengduo a 或 bookUrl 替换为 _1/
  var tocHref = legado.dom.selectAttr(doc, ".gengduo a", "href") || "";
  var tocUrl = tocHref ? toAbs(tocHref) : bookUrl.replace(/\/$/, "") + "_1/";

  legado.dom.free(doc);
  legado.log("[bookInfo] name=" + name + " tocUrl=" + tocUrl);

  return {
    name: name,
    author: author,
    bookUrl: bookUrl,
    coverUrl: coverUrl,
    kind: kind,
    lastChapter: lastChapter,
    intro: intro,
    tocUrl: tocUrl
  };
}

// ─── 章节列表 ─────────────────────────────────────────────────────────

async function chapterList(tocUrl) {
  legado.log("[chapterList] url=" + tocUrl);

  var html = await legado.http.get(tocUrl);
  html = ensureCfPassed(tocUrl, html);

  var doc = legado.dom.parse(html);

  // 获取总页数，格式 "1/60"
  var pageText = legado.dom.selectText(doc, ".pagelink span") || "1/1";
  var totalPages = 1;
  var m = pageText.match(/\/(\d+)/);
  if (m) totalPages = parseInt(m[1], 10);
  legado.log("[chapterList] 总页数=" + totalPages);

  // 提取 base URL（例如 https://m.rdrw8.com/rwxs/11914_1/ → base = https://m.rdrw8.com/rwxs/11914_）
  var baseUrl = tocUrl.replace(/_\d+\/$/, "_");

  // 收集第一页章节
  var chapters = [];
  function collectLinks(d) {
    var links = legado.dom.selectAll(d, "a.xbk");
    for (var i = 0; i < links.length; i++) {
      var chapterName = (legado.dom.text(links[i]) || "").trim();
      if (chapterName === "本页章节列表结束！") continue;
      var href = legado.dom.attr(links[i], "href") || "";
      if (chapterName && href) {
        chapters.push({ name: chapterName, url: toAbs(href) });
      }
    }
    legado.dom.free(d);
  }
  collectLinks(doc);

  // 获取剩余页
  for (var p = 2; p <= totalPages; p++) {
    var pageUrl = baseUrl + p + "/";
    var pHtml = await legado.http.get(pageUrl);
    pHtml = ensureCfPassed(pageUrl, pHtml);
    var pDoc = legado.dom.parse(pHtml);
    collectLinks(pDoc);
  }

  legado.log("[chapterList] 返回 " + chapters.length + " 章");
  return chapters;
}

// ─── 章节正文 ─────────────────────────────────────────────────────────

async function chapterContent(chapterUrl) {
  legado.log("[chapterContent] url=" + chapterUrl);

  var html = await legado.http.get(chapterUrl);
  html = ensureCfPassed(chapterUrl, html);

  var doc = legado.dom.parse(html);

  var contentSelectors = [
    "article#nr", "#J_content", ".content-text", ".chapter-content", ".book-content",
    "#chapter-content", ".article-content", ".read-content",
    ".text-content", ".novel-content", "#content", ".content"
  ];

  var content = "";
  for (var i = 0; i < contentSelectors.length; i++) {
    var contentEl = legado.dom.select(doc, contentSelectors[i]);
    if (contentEl) {
      content = legado.dom.text(contentEl).replace(/[\r\n\t]/g, "\n").trim();
      content = content.replace(/\n{3,}/g, "\n\n").trim();
      legado.log("[chapterContent] 使用选择器: " + contentSelectors[i]);
      break;
    }
  }

  // 如果没找到，尝试获取body
  if (!content) {
    legado.dom.remove(doc, "script");
    legado.dom.remove(doc, "style");
    legado.dom.remove(doc, "nav");
    legado.dom.remove(doc, "header");
    legado.dom.remove(doc, "footer");
    legado.dom.remove(doc, ".ad");
    var body = legado.dom.select(doc, "body");
    if (body) {
      content = legado.dom.text(body).replace(/[\r\n\t]/g, "\n").trim();
      content = content.replace(/\n{3,}/g, "\n\n").trim();
    }
  }

  legado.dom.free(doc);
  legado.log("[chapterContent] 正文长度: " + content.length);
  return content;
}

// ─── 发现页 ──────────────────────────────────────────────────────────

async function explore(page, category) {
  legado.log("[explore] page=" + page + " category=" + category);

  var cat = category || 1;
  var pg = page || 1;
  var url = BASE + "/class/" + cat + "_" + pg + "/";

  var html = await legado.http.get(url);
  html = ensureCfPassed(url, html);

  var doc = legado.dom.parse(html);
  var books = [];

  var items = legado.dom.selectAll(doc, "ul.fk li");
  for (var i = 0; i < items.length; i++) {
    var item = items[i];
    var name = legado.dom.selectAttr(item, "a.blue", "title")
             || legado.dom.selectText(item, "a.blue")
             || "";
    name = name.replace(/[\r\n\t]/g, "").trim();
    var href = legado.dom.selectAttr(item, "a.blue", "href") || "";
    if (!name || !href) continue;
    var author = legado.dom.selectText(item, "a[target=_blank]") || "";
    author = author.replace(/[\r\n\t]/g, "").trim();
    books.push({
      name: name,
      author: author,
      bookUrl: toAbs(href),
      coverUrl: "",
      kind: "",
      lastChapter: ""
    });
  }

  legado.dom.free(doc);
  legado.log("[explore] 返回 " + books.length + " 条");
  return books;
}

// ─── 测试 ─────────────────────────────────────────────────────────────

async function TEST(type) {
  if (type === '__list__') return ['search', 'explore', 'bookInfo', 'chapterList'];

  if (type === 'explore') {
    var r = await explore(1, 1);
    if (r.length > 0) return { passed: true, message: '发现返回 ' + r.length + ' 条 ✓' };
    return { passed: false, message: '发现返回 0 条' };
  }

  if (type === 'search') {
    var r = await search('斗罗大陆', 1);
    if (r.length > 0) return { passed: true, message: '搜索返回 ' + r.length + ' 条 ✓' };
    return { passed: false, message: '搜索返回 0 条' };
  }

  if (type === 'bookInfo') {
    var r = await bookInfo('https://m.rdrw8.com/rwxs/11914/');
    if (r.name && r.author && r.tocUrl) return { passed: true, message: '书籍信息 name=' + r.name + ' author=' + r.author + ' ✓' };
    return { passed: false, message: '书籍信息不完整: ' + JSON.stringify(r) };
  }

  if (type === 'chapterList') {
    // 只测第一页章节，不遍历全部60页
    var html = await legado.http.get('https://m.rdrw8.com/rwxs/11914_1/');
    var doc = legado.dom.parse(html);
    var links = legado.dom.selectAll(doc, 'a.xbk');
    legado.dom.free(doc);
    if (links.length > 0) return { passed: true, message: '第1页 ' + links.length + ' 章 ✓' };
    return { passed: false, message: '章节列表为空' };
  }

  return { passed: false, message: '未知测试类型: ' + type };
}
