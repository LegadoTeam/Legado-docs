// @name        万年漫画
// @version     0.3.0
// @author      test
// @url         https://www.wnian001.com
// @logo        https://www.wnian001.com/wn.ico
// @enabled     true
// @tags        免费,漫画,韩漫
// @type        comic
// @description 万年漫画（wnian001.com）。Cloudflare 保护站点，首次使用需通过浏览器验证。

// ─── 内置测试 ─────────────────────────────────────────────────────────────

async function TEST(type) {
  if (type === "__list__") return ["search", "bookInfo", "chapterList", "chapterContent", "explore"];

  if (type === "search") {
    var results = await search("社团学姐", 1);
    if (!results || results.length < 1) return { passed: false, message: "搜索结果为空" };
    return { passed: true, message: "搜索返回 " + results.length + " 条结果 ✓" };
  }
  if (type === "bookInfo") {
    var info = await bookInfo("https://www.wnian001.com/post/100895481.html");
    if (!info || !info.name) return { passed: false, message: "bookInfo 返回为空" };
    return { passed: true, message: "name=" + info.name + " ✓" };
  }
  if (type === "chapterList") {
    var chs = await chapterList("https://www.wnian001.com/post/100895481.html");
    if (!chs || chs.length < 1) return { passed: false, message: "章节列表为空" };
    return { passed: true, message: "共 " + chs.length + " 章 ✓" };
  }
  if (type === "chapterContent") {
    var content = await chapterContent("https://www.wnian001.com/post/100895481/page-2.html");
    if (!content) return { passed: false, message: "正文为空" };
    return { passed: true, message: "正文长度=" + content.length + " ✓" };
  }
  if (type === "explore") {
    var cats = await explore(1, "GETALL");
    if (!cats || cats.length < 1) return { passed: false, message: "分类列表为空" };
    var items = await explore(1, cats[0]);
    if (!items || items.length < 1) return { passed: false, message: cats[0] + " 分类结果为空" };
    return { passed: true, message: cats.length + " 个分类，首分类返回 " + items.length + " 条 ✓" };
  }

  return { passed: false, message: "未知测试类型: " + type };
}

// ─── 配置 ─────────────────────────────────────────────────────────────────

var BASE = "https://www.wnian001.com";

// 发现页分类（首页导航 + 热搜）
var EXPLORE_CATEGORIES = [
  { name: "🔥 热搜", path: "/", mode: "hot" },
  { name: "短篇漫画", path: "/item/短篇漫画" },
  { name: "连载漫画", path: "/item/连载" },
  { name: "完结漫画", path: "/item/完结" },
  { name: "爱情漫画", path: "/mh" },
  { name: "美女写真", path: "/meinv" },
];

// ─── CF 保护检测 ──────────────────────────────────────────────────────────

/**
 * 检测 HTML 是否被 Cloudflare 拦截。
 * 覆盖 CF 经典 5 秒盾、Turnstile 人机验证、JS Challenge 等多种变体。
 * @param {string} html - HTTP 或浏览器页面 HTML
 * @returns {boolean}
 */
function isCfBlocked(html) {
  if (!html || html.length < 200) {
    legado.log("[CF:detect] blocked: html too short (" + (html ? html.length : 0) + ")");
    return true;
  }
  // 仅匹配 CF 挑战/拦截页特有的标记，排除正常页面也会出现的（如 ray-id、/_cf/ 资源路径）
  var markers = [
    "Just a moment",
    "cf-browser-verification",
    "Checking your browser",
    // "challenge-platform",
    "cf-challenge-running",
    "managed_checking_msg",
    "cf-please-wait",
    "cf-turnstile-wrapper",
    "正在进行安全验证",
  ];
  for (var i = 0; i < markers.length; i++) {
    if (html.indexOf(markers[i]) !== -1) {
      legado.log("[CF:detect] blocked: matched '" + markers[i] + "' (html=" + html.length + ")");
      return true;
    }
  }
  return false;
}

/**
 * 使用新版浏览器探测 API 完成 Cloudflare 验证。
 *
 * 设计要点：
 * 1. acquire 初始不显示窗口，仅在 poll 检测到真实挑战时才显示，避免无挑战时无谓弹窗。
 * 2. navigate 只等 "load" 事件，不等 "networkidle"：CF 挑战页跳转时会中断
 *    wait_for_network_idle 的 eval，导致 navigate() 挂到超时（30 秒）才抛错。
 * 3. 验证通过后直接返回浏览器渲染的真实 HTML，无需额外 HTTP 重试，
 *    同时规避了 reqwest 内置 jar 与 BROWSER_COOKIES 双重 Cookie 冲突。
 * 4. browser.cookies(url) 在验证后仍调用，将 cf_clearance 同步到全局
 *    Cookie Store，保证后续 HTTP 请求自动携带正确 Cookie。
 *
 * @param {string} url  - 要访问的 URL
 * @param {string} html - HTTP 响应内容（已被 CF 拦截）
 * @returns {string} - 验证通过后返回真实页面 HTML，超时则返回原始 HTML
 */
function ensureCfPassed(url, html) {
  if (!isCfBlocked(html)) return html;

  legado.log("[CF] 检测到 CF 拦截 (html=" + html.length + ")，启动浏览器探测...");

  // 初始隐藏获取 session，检测到真实挑战后才显示（避免已清除时弹出窗口）
  var sessionId = legado.browser.acquire("cf", { visible: false });
  legado.log("[CF] 会话 id=" + sessionId);

  // 只等 load 事件：CF 挑战完成后页面跳转会中断 networkidle eval，导致整个 navigate 挂死
  legado.browser.navigate(sessionId, url, { waitFor: "load" });

  // 轮询等待真实页面（CF 验证 + 跳转通常需要 1–10 秒）
  var maxAttempts = 60;
  var passed = false;
  var realHtml = null;
  var browserShown = false;

  for (var i = 0; i < maxAttempts; i++) {
    var pageHtml = legado.browser.html(sessionId);
    legado.log("[CF] 轮询 #" + (i + 1) + " html=" + (pageHtml ? pageHtml.length : 0));

    if (pageHtml && pageHtml.length > 500 && !isCfBlocked(pageHtml)) {
      passed = true;
      realHtml = pageHtml;
      legado.log("[CF] 浏览器验证通过 (尝试 " + (i + 1) + " 次)");
      break;
    }

    // 首次检测到挑战才显示浏览器窗口，让用户与 Turnstile/CAPTCHA 交互
    if (!browserShown) {
      legado.toast("需要完成 Cloudflare 验证，请在弹出窗口中操作");
      legado.browser.show(sessionId);
      browserShown = true;
    }

    legado.sleep(1000);
  }

  if (!passed) {
    legado.log("[CF] 验证超时，隐藏窗口");
    legado.browser.hide(sessionId);
    return html;
  }

  // 同步 Cookie 供后续 HTTP 请求使用
  var synced = legado.browser.cookies(url);
  var httpCookies = legado.http.cookies(url);
  legado.log("[CF] Cookie 同步: browser=" + (synced ? synced.length : 0) + "个 http=" + httpCookies.substring(0, 120));

  legado.browser.hide(sessionId);

  // 直接返回浏览器渲染的真实页面 HTML，无需额外 HTTP 重试
  return realHtml;
}

// ─── 工具 ────────────────────────────────────────────────────────────────

function toAbs(href) {
  if (!href) return "";
  if (href.indexOf("http") === 0) return href;
  if (href.indexOf("//") === 0) return "https:" + href;
  if (href.indexOf("/") === 0) return BASE + href;
  return BASE + "/" + href;
}

// ─── 解析文章列表（搜索 & 发现共用） ─────────────────────────────────────

function parseArticleList(doc) {
  var items = legado.dom.selectAll(doc, "article.excerpt");
  if (!items || items.length === 0) return [];

  var results = [];
  for (var i = 0; i < items.length; i++) {
    var item = items[i];
    try {
      var nameEl = legado.dom.select(item, "h2 a");
      var name = nameEl ? legado.dom.text(nameEl).trim() : "";
      var href = nameEl ? legado.dom.attr(nameEl, "href") : "";
      var bookUrl = toAbs(href);

      var catEl = legado.dom.select(item, "p.cat");
      var kind = catEl ? legado.dom.text(catEl).trim() : "";

      var statusEl = legado.dom.select(item, "span.subtitle");
      var status = statusEl ? legado.dom.text(statusEl).trim() : "";
      if (status && kind) kind = kind + " · " + status;
      else if (status) kind = status;

      var coverEl = legado.dom.select(item, ".thumbnail img, .focus img");
      var coverUrl = "";
      if (coverEl) {
        coverUrl = legado.dom.attr(coverEl, "data-src") || legado.dom.attr(coverEl, "src") || "";
        coverUrl = toAbs(coverUrl);
      }

      var introEl = legado.dom.select(item, "p.note");
      var intro = introEl ? legado.dom.text(introEl).trim() : "";

      if (name && bookUrl) {
        results.push({
          name: name,
          author: "",
          bookUrl: bookUrl,
          coverUrl: coverUrl,
          kind: kind,
          intro: intro,
        });
      }
    } catch (e) {
      legado.log("[parseArticleList] 解析条目异常: " + e);
    }
  }
  return results;
}

// ─── 搜索 ────────────────────────────────────────────────────────────────

async function search(keyword, page) {
  // WordPress 搜索：/?s=keyword（不支持分页参数，直接返回全部匹配结果）
  var url = BASE + "/?s=" + encodeURIComponent(keyword);
  legado.log("[search] keyword=" + keyword + " url=" + url);

  var html = await legado.http.get(url);
  html = ensureCfPassed(url, html);

  var doc = legado.dom.parse(html);

  var results = parseArticleList(doc);
  legado.dom.free(doc);
  legado.log("[search] 返回 " + results.length + " 条结果");
  return results;
}

// ─── 详情 ────────────────────────────────────────────────────────────────

async function bookInfo(bookUrl) {
  legado.log("[bookInfo] url=" + bookUrl);

  var html = await legado.http.get(bookUrl);
  html = ensureCfPassed(bookUrl, html);

  var doc = legado.dom.parse(html);

  // 标题：h1.article-title 内的 <a> 文本（不含 span.subtitle）
  var titleEl = legado.dom.select(doc, "h1.article-title a");
  var name = titleEl ? legado.dom.text(titleEl).trim() : "";

  // 连载状态
  var statusEl = legado.dom.select(doc, "h1.article-title span.subtitle");
  var status = statusEl ? legado.dom.text(statusEl).trim() : "";

  // 封面：.c-img img
  var coverEl = legado.dom.select(doc, ".c-img img");
  var coverUrl = "";
  if (coverEl) {
    coverUrl = legado.dom.attr(coverEl, "src") || "";
    coverUrl = toAbs(coverUrl);
  }

  // 简介：span.dis
  var introEl = legado.dom.select(doc, "span.dis");
  var intro = introEl ? legado.dom.text(introEl).trim() : "";
  // 去除开头的 "==>" 标记
  intro = intro.replace(/^=+>/, "").trim();

  // 分类：.article-meta a[rel="category tag"]
  var catEl = legado.dom.select(doc, '.article-meta a[rel="category tag"]');
  var kind = catEl ? legado.dom.text(catEl).trim() : "";
  if (status) kind = kind ? kind + " · " + status : status;

  // 标签
  var tagEls = legado.dom.selectAll(doc, ".post-tags a");
  var tagList = [];
  if (tagEls) {
    for (var i = 0; i < tagEls.length; i++) {
      var tagText = legado.dom.text(tagEls[i]).trim();
      if (tagText) tagList.push(tagText);
    }
  }
  if (tagList.length > 0) kind = kind ? kind + " | " + tagList.join(", ") : tagList.join(", ");

  // 最新章节：取最后一个 chapter-link
  var chLinks = legado.dom.selectAll(doc, "a.chapter-link");
  var lastChapter = "";
  if (chLinks && chLinks.length > 0) {
    lastChapter = legado.dom.text(chLinks[chLinks.length - 1]).trim();
  }

  legado.dom.free(doc);
  legado.log("[bookInfo] name=" + name + " kind=" + kind + " chapters=" + (chLinks ? chLinks.length : 0));

  return {
    name: name,
    author: "",
    coverUrl: coverUrl,
    intro: intro,
    kind: kind,
    lastChapter: lastChapter,
    bookUrl: bookUrl,
    tocUrl: bookUrl,
  };
}

// ─── 目录 ────────────────────────────────────────────────────────────────

async function chapterList(tocUrl) {
  legado.log("[chapterList] url=" + tocUrl);

  var html = await legado.http.get(tocUrl);
  html = ensureCfPassed(tocUrl, html);

  var doc = legado.dom.parse(html);
  var chapters = [];

  // 章节链接：a.chapter-link
  var links = legado.dom.selectAll(doc, "a.chapter-link");
  legado.log("[chapterList] a.chapter-link 命中=" + (links ? links.length : 0));

  if (links) {
    for (var i = 0; i < links.length; i++) {
      var a = links[i];
      var href = legado.dom.attr(a, "href");
      var chName = legado.dom.text(a).trim();
      if (!href || !chName) continue;
      chapters.push({ name: chName, url: toAbs(href) });
    }
  }

  legado.dom.free(doc);
  legado.log("[chapterList] 返回 " + chapters.length + " 章");
  return chapters;
}

// ─── 正文（漫画图片） ────────────────────────────────────────────────────

function prepareImage(url, pageIndex) {
  var headers = { Referer: BASE + "/" };
  legado.log("[prepareImage] pageIndex=" + pageIndex + " url=" + url + " headers=" + JSON.stringify(headers));
  return { headers: headers };
}

async function chapterContent(chapterUrl) {
  legado.log("[chapterContent] url=" + chapterUrl);

  var html = await legado.http.get(chapterUrl);
  html = ensureCfPassed(chapterUrl, html);

  var doc = legado.dom.parse(html);

  // 漫画图片在 .article-content img 中
  var contentEl = legado.dom.select(doc, ".article-content");
  if (!contentEl) {
    legado.log("[chapterContent] 未找到 .article-content");
    legado.dom.free(doc);
    return "";
  }

  var imgs = legado.dom.selectAll(contentEl, "img");
  var imageUrls = [];
  if (imgs) {
    for (var i = 0; i < imgs.length; i++) {
      var src = legado.dom.attr(imgs[i], "data-src") || legado.dom.attr(imgs[i], "src") || "";
      if (!src) continue;
      src = toAbs(src);
      // 跳过封面图（在 .c-img 中的封面已被包含在 content 区域，过滤掉）
      if (src.indexOf("/manga-cover/") !== -1) continue;
      imageUrls.push(src);
    }
  }

  legado.dom.free(doc);
  legado.log("[chapterContent] 获取 " + imageUrls.length + " 张图片");

  // 返回 <img> 标签拼接（漫画模式下由阅读器渲染）
  // var result = "";
  // for (var j = 0; j < imageUrls.length; j++) {
  //   result += '<img src="' + imageUrls[j] + '">\n';
  // }
  return JSON.stringify(imageUrls);
}

// ─── 发现页 ──────────────────────────────────────────────────────────────

async function explore(page, category) {
  legado.log("[explore] page=" + page + " category=" + category);

  // 返回分类列表
  if (!category || category === "GETALL") {
    var names = [];
    for (var i = 0; i < EXPLORE_CATEGORIES.length; i++) {
      names.push(EXPLORE_CATEGORIES[i].name);
    }
    return names;
  }

  // 查找分类配置
  var cat = null;
  for (var j = 0; j < EXPLORE_CATEGORIES.length; j++) {
    if (EXPLORE_CATEGORIES[j].name === category) {
      cat = EXPLORE_CATEGORIES[j];
      break;
    }
  }
  if (!cat) {
    legado.log("[explore] 未知分类: " + category);
    return [];
  }

  // 热搜模式：从首页提取 a.hot-keyword 链接列表
  if (cat.mode === "hot") {
    if (page > 1) return []; // 热搜仅一页
    var homeUrl = BASE + cat.path;
    var homeHtml = await legado.http.get(homeUrl);
    homeHtml = ensureCfPassed(homeUrl, homeHtml);

    var homeDoc = legado.dom.parse(homeHtml);
    var hotLinks = legado.dom.selectAll(homeDoc, "a.hot-keyword");
    var hotResults = [];
    if (hotLinks) {
      for (var h = 0; h < hotLinks.length; h++) {
        var hotName = legado.dom.text(hotLinks[h]).trim();
        var hotHref = legado.dom.attr(hotLinks[h], "href");
        if (hotName && hotHref) {
          hotResults.push({
            name: hotName,
            author: "",
            bookUrl: toAbs(hotHref),
            coverUrl: "",
            kind: "热搜",
            intro: "",
          });
        }
      }
    }
    legado.dom.free(homeDoc);
    legado.log("[explore] 热搜返回 " + hotResults.length + " 条");
    return hotResults;
  }

  // 标准分类：请求分类页，解析 article.excerpt 列表
  // 分类页分页：/item/xxx/page/N 或 /mh/page/N
  var catUrl = BASE + cat.path;
  if (page > 1) catUrl += "/page/" + page;
  legado.log("[explore] url=" + catUrl);

  var catHtml = await legado.http.get(catUrl);
  catHtml = ensureCfPassed(catUrl, catHtml);

  var catDoc = legado.dom.parse(catHtml);
  var catResults = parseArticleList(catDoc);
  legado.dom.free(catDoc);
  legado.log("[explore] " + category + " 返回 " + catResults.length + " 条");
  return catResults;
}
