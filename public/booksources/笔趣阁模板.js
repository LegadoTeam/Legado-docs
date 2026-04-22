// @name        笔趣阁模板
// @version     1.1.0
// @author      Legado Tauri
// @url         https://m.22biqu.net
// @logo        https://m.22biqu.net/favicon.ico
// @enabled true
// @tags        笔趣阁,小说,免费小说,域名多
// @description 通用笔趣阁模板，CSS 选择器集中配置，适配不同笔趣阁镜像站只需修改顶部常量。

//  还需要加入最后更新日志更新时间 下载地址等等信息
// 用于书源自身更新

// ─── 内置测试 ─────────────────────────────────────────────────────────────

async function TEST(type) {
  if (type === "__list__") return ["search", "explore"];

  if (type === "search") {
    var results = await search("斗破苍穹", 1);
    if (!results || results.length < 1) return { passed: false, message: "搜索结果为空" };
    var found = false;
    for (var i = 0; i < results.length; i++) {
      if (results[i].author && results[i].author.indexOf("天蚕土豆") !== -1) {
        found = true;
        break;
      }
    }
    if (!found) return { passed: false, message: '搜索结果中未找到作者包含"天蚕土豆"的条目' };
    return { passed: true, message: '搜索"斗破苍穹"返回 ' + results.length + " 条结果 ✓" };
  }

  if (type === "explore") {
    var books = await explore(1, "总人气排行");
    if (!books || books.length < 1) return { passed: false, message: "发现页 [总人气排行] 返回为空" };
    return { passed: true, message: "发现页 [总人气排行]: " + books.length + " 条结果 ✓" };
  }

  return { passed: false, message: "未知测试类型: " + type };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  站点配置 — 修改此区域即可适配不同笔趣阁镜像    注释:常用网站都可以以此模板来制作书源
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

var BASE = "https://m.22biqu.net";

/** 搜索接口路径（POST 表单，字段：searchkey + submit） */
var SEARCH_URL = "/ss/";

/** 章节 URL 正则，用于过滤出有效的章节链接 */
var CHAPTER_URL_PATTERN = /\/biqu\d+\/\d+\.html/;

/** 书籍链接选择器中的关键路径，用于 href 属性匹配 */
var BOOK_LINK_HREF_KEY = "/biqu";

// ── 搜索页选择器 ──────────────────────────────────────────────────────────
var S_SEARCH = {
  /** 搜索结果列表项 */
  item: ".bookbox",
  /** 书名 */
  name: ".bookname a",
  /** 书籍链接 (取 href) */
  bookLink: 'a[href*="/biqu"]',
  /** 封面图片 */
  coverImg: "img",
  /** 作者/类型信息块 */
  authorBlock: ".author",
  /** 最新章节 */
  lastChapter: ".update a",
};

// ── 详情页选择器（OGP meta 标签） ─────────────────────────────────────────
var S_DETAIL = {
  name: '[property="og:novel:book_name"]',
  author: '[property="og:novel:author"]',
  coverUrl: '[property="og:image"]',
  intro: '[property="og:description"]',
  /** 最新章节（兼容 latest/lastest 拼写） */
  lastChapter: '[property="og:novel:latest_chapter_name"]',
  lastChapterAlt: '[property="og:novel:lastest_chapter_name"]',
  kind: '[property="og:novel:category"]',
};

// ── 章节列表选择器 ────────────────────────────────────────────────────────
var S_TOC = {
  /**
   * 章节链接选择器。
   * 22biqu.net 页面有两个 .directoryArea：
   *   - #chapterlist（最新章节区，5 条，需排除）
   *   - 无 id 的 .directoryArea（正文目录区，每页 50 章）
   * 使用 :not(#chapterlist) 精确排除"最新章节"干扰区块。
   */
  chapterLink: ".directoryArea:not(#chapterlist) a",
  /**
   * 网站目录排序方向：
   *   false = 网站已正序（第1章在前），直接使用
   *   true  = 网站为倒序（最新在前），需要 reverse
   */
  reversed: false,
  /**
   * 分页下拉选择器（优先模式）。
   * 22biqu.net 在目录页底部放置 <select id="indexselect">，
   * 每个 <option value="/biquXXXX/N/"> 对应一个分页。
   * 直接枚举所有 option 值比跟随"下一页"链接更可靠，不受超时截断影响。
   * 设为空字符串则退回"下一页"翻页模式。
   */
  pageSelect: "#indexselect option",
  /** 翻页按键文案（pageSelect 为空时的备用模式） */
  nextPageText: "下一页",
  /** 最大分页数 */
  maxPages: 50,
};

// ── 正文页选择器 ──────────────────────────────────────────────────────────
var S_CONTENT = {
  /** 正文容器 */
  container: "#chaptercontent",
  /** 段落标签 */
  paragraph: "p",
  /** 下一页链接选择器 */
  nextPage: "#pt_next",
  /**
   * 下一页链接的文案关键字。
   * 用于区分"下一页"（章节内分页）和"下一章"（跳到下一章）：
   * 只有链接文字包含此关键字时，才认定为章节内翻页并继续抓取。
   * 若该站点没有章节内分页，设为空字符串 '' 以跳过此检查。
   */
  nextPageText: "下一页",
  /** 需要过滤的干扰文本正则 */
  noisePattern: /本章未完|加入书签|章节报错|点击下一页|笔趣阁/,
  /** 最大正文分页数 */
  maxPages: 10,
};

// ── 发现页选择器 ──────────────────────────────────────────────────────────
var S_EXPLORE = {
  /** 排行页卡片 */
  rankItem: ".hot_sale",
  rankName: ".title",
  rankNameAlt: "h4",
  /** 分类页卡片（复用搜索页结构） */
  listItem: ".bookbox",
  listName: ".bookname a",
  /** 公共选择器 */
  coverImg: "img",
  authorBlock: ".author",
  lastChapter: ".update a",
  bookLink: 'a[href*="/biqu"]',
};

// ── 发现分类 ─────────────────────────────────────────────────────────────
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

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  通用工具 — 以下代码一般无需修改
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * 将相对 URL 补全为绝对 URL。
 */
function toAbs(href) {
  if (!href) return "";
  if (href.indexOf("http") === 0) return href;
  return BASE + (href.charAt(0) === "/" ? href : "/" + href);
}

/**
 * 从元素提取封面图 URL，按优先级尝试 data-src / data-original / src。
 */
function extractCover(el, selector) {
  return (
    legado.dom.selectAttr(el, selector, "data-src") ||
    legado.dom.selectAttr(el, selector, "data-original") ||
    legado.dom.selectAttr(el, selector, "src") ||
    ""
  );
}

/**
 * 从作者信息块解析出作者名和类型。
 * 输入示例: "作者：xxx 类型：玄幻"
 */
function parseAuthorBlock(text) {
  var result = { author: "", kind: "" };
  if (!text) return result;
  var am = text.match(/作者[：:]\s*(\S+)/);
  if (am) result.author = am[1];
  var km = text.match(/类型[：:]\s*(\S+)/);
  if (km) result.kind = km[1];
  return result;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  书源接口实现
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// ─── 搜索 ─────────────────────────────────────────────────────────────────

async function search(keyword, page) {
  legado.log("[search] keyword=" + keyword);

  var url = BASE + SEARCH_URL;
  var body = "searchkey=" + encodeURIComponent(keyword) + "&submit=";
  var headers = {
    "Content-Type": "application/x-www-form-urlencoded",
    "Referer": BASE + "/"
  };
  var html = await legado.http.post(url, body, headers);
  var doc = legado.dom.parse(html);
  var books = [];

  var items = legado.dom.selectAll(doc, S_SEARCH.item);
  for (var i = 0; i < items.length; i++) {
    var el = items[i];

    var bookUrl = legado.dom.selectAttr(el, S_SEARCH.bookLink, "href");
    if (!bookUrl) continue;
    bookUrl = toAbs(bookUrl);

    var name = legado.dom.selectText(el, S_SEARCH.name);
    if (!name) continue;

    var coverUrl = extractCover(el, S_SEARCH.coverImg);
    var info = parseAuthorBlock(legado.dom.selectText(el, S_SEARCH.authorBlock));
    var lastChapter = legado.dom.selectText(el, S_SEARCH.lastChapter) || "";

    books.push({
      name: name,
      author: info.author,
      bookUrl: bookUrl,
      coverUrl: coverUrl,
      lastChapter: lastChapter,
      kind: info.kind,
    });
  }

  legado.dom.free(doc);
  legado.log("[search] found=" + books.length);
  return books;
}

// ─── 书籍详情 ─────────────────────────────────────────────────────────────

async function bookInfo(bookUrl) {
  legado.log("[bookInfo] url=" + bookUrl);
  var html = await legado.http.get(bookUrl);
  var doc = legado.dom.parse(html);

  var result = {
    name: legado.dom.selectAttr(doc, S_DETAIL.name, "content") || "",
    author: legado.dom.selectAttr(doc, S_DETAIL.author, "content") || "",
    coverUrl: legado.dom.selectAttr(doc, S_DETAIL.coverUrl, "content") || "",
    intro: legado.dom.selectAttr(doc, S_DETAIL.intro, "content") || "",
    lastChapter: legado.dom.selectAttr(doc, S_DETAIL.lastChapter, "content") || legado.dom.selectAttr(doc, S_DETAIL.lastChapterAlt, "content") || "",
    kind: legado.dom.selectAttr(doc, S_DETAIL.kind, "content") || "",
    tocUrl: bookUrl,
  };

  legado.dom.free(doc);
  return result;
}

// ─── 章节列表 ─────────────────────────────────────────────────────────────

async function chapterList(tocUrl) {
  legado.log("[chapterList] url=" + tocUrl);
  var chapters = [];
  var seenUrls = {}; // 用于去重，避免多分页中同一章节 URL 被重复收录

  // ── 步骤1：从第一页获取所有分页 URL ─────────────────────────────────────
  // 22biqu.net 在目录底部有 <select id="indexselect">，每个 option value 是一个分页路径。
  // 读出后直接按序抓取，规避"下一页"文字匹配失败和超时截断问题。
  var html0 = await legado.http.get(tocUrl);
  var doc0 = legado.dom.parse(html0);
  var optVals = S_TOC.pageSelect ? legado.dom.selectAllAttrs(doc0, S_TOC.pageSelect, "value") : [];
  legado.dom.free(doc0);

  if (optVals && optVals.length > 0) {
    // ── 模式一：下拉枚举所有分页（推荐）───────────────────────────────────
    legado.log("[chapterList] select mode, pages=" + optVals.length);
    var pageCount = Math.min(optVals.length, S_TOC.maxPages);
    // ── 并发批量抓取所有分页 ────────────────────────────────────────────────
    var pageUrls = [];
    for (var p = 0; p < pageCount; p++) {
      pageUrls.push(toAbs(optVals[p]));
    }
    legado.log("[chapterList] batchGet " + pageUrls.length + " pages");
    var batchResults = await legado.http.batchGet(pageUrls);
    for (var p = 0; p < batchResults.length; p++) {
      var res = batchResults[p];
      if (!res.ok) {
        legado.log("[chapterList] page failed: " + res.url);
        continue;
      }
      var doc = legado.dom.parse(res.data);
      var links = legado.dom.selectAll(doc, S_TOC.chapterLink);
      for (var i = 0; i < links.length; i++) {
        var href = legado.dom.attr(links[i], "href") || "";
        if (!CHAPTER_URL_PATTERN.test(href)) continue; // 过滤掉导航/广告等非章节链接
        var chUrl = toAbs(href);
        var chName = (legado.dom.text(links[i]) || "").trim();
        if (chName && chUrl && !seenUrls[chUrl]) {
          seenUrls[chUrl] = 1;
          chapters.push({ name: chName, url: chUrl });
        }
      }
      legado.dom.free(doc);
    }
  } else {
    // ── 模式二：跟随"下一页"链接（备用）──────────────────────────────────
    legado.log("[chapterList] nextpage mode");
    var url = tocUrl;
    for (var p = 0; p < S_TOC.maxPages; p++) {
      var html = await legado.http.get(url);
      var doc = legado.dom.parse(html);
      var links = legado.dom.selectAll(doc, S_TOC.chapterLink);
      for (var i = 0; i < links.length; i++) {
        var href = legado.dom.attr(links[i], "href") || "";
        if (!CHAPTER_URL_PATTERN.test(href)) continue; // 过滤掉导航/广告等非章节链接
        var chUrl = toAbs(href);
        var chName = (legado.dom.text(links[i]) || "").trim();
        if (chName && chUrl && !seenUrls[chUrl]) {
          seenUrls[chUrl] = 1;
          chapters.push({ name: chName, url: chUrl });
        }
      }
      var nextLink = legado.dom.selectByText(doc, S_TOC.nextPageText);
      var nextHref = nextLink ? legado.dom.attr(nextLink, "href") || "" : "";
      legado.dom.free(doc);
      // href 为空或 javascript: 伪协议均表示没有下一页
      if (!nextHref || nextHref.indexOf("javascript") !== -1) break;
      var nextUrl = toAbs(nextHref);
      if (nextUrl === url) break; // 防止"下一页"指向自身造成死循环
      url = nextUrl;
    }
  }

  if (S_TOC.reversed) chapters.reverse();
  legado.log("[chapterList] total=" + chapters.length);
  return chapters;
}

// ─── 正文 ─────────────────────────────────────────────────────────────────

async function chapterContent(chapterUrl) {
  legado.log("[content] url=" + chapterUrl);
  var paragraphs = [];
  var url = chapterUrl;

  for (var p = 0; p < S_CONTENT.maxPages; p++) {
    var html = await legado.http.get(url);
    var doc = legado.dom.parse(html);

    var contentEl = legado.dom.select(doc, S_CONTENT.container);
    if (!contentEl) {
      legado.dom.free(doc);
      legado.log("[content] container not found at page " + (p + 1));
      break;
    }

    var pTags = legado.dom.selectAll(contentEl, S_CONTENT.paragraph);
    for (var i = 0; i < pTags.length; i++) {
      var text = (legado.dom.text(pTags[i]) || "").trim();
      if (text && !S_CONTENT.noisePattern.test(text)) {
        paragraphs.push(text);
      }
    }

    var nextEl = legado.dom.select(doc, S_CONTENT.nextPage);
    var nextHref = nextEl ? legado.dom.attr(nextEl, "href") || "" : "";
    var nextText = nextEl ? legado.dom.text(nextEl) || "" : "";
    legado.dom.free(doc);

    // href 为空或 javascript: 伪协议均表示没有下一页
    if (!nextHref || nextHref.indexOf("javascript") !== -1) break;
    // 文案不含"下一页"则说明是"下一章"链接，停止章节内翻页
    if (S_CONTENT.nextPageText && nextText.indexOf(S_CONTENT.nextPageText) === -1) break;
    var nextUrl = toAbs(nextHref);
    if (nextUrl === url) break; // 防止"下一页"指向自身造成死循环
    url = nextUrl;
  }

  // 段落之间以空行分隔，保留排版结构
  return paragraphs.join("\n\n");
}

// ─── 发现页 ──────────────────────────────────────────────────────────────

/**
 * 从排行/分类页 HTML 中提取书籍列表。
 * 优先尝试排行页结构，无结果时回退到分类页结构。
 */
function parseBooksFromHtml(html) {
  var doc = legado.dom.parse(html);
  var books = [];

  // 排行页结构
  var items = legado.dom.selectAll(doc, S_EXPLORE.rankItem);
  for (var i = 0; i < items.length; i++) {
    var el = items[i];
    var bookUrl = legado.dom.selectAttr(el, S_EXPLORE.bookLink, "href");
    if (!bookUrl) continue;
    bookUrl = toAbs(bookUrl);

    var name = legado.dom.selectText(el, S_EXPLORE.rankName) || legado.dom.selectText(el, S_EXPLORE.rankNameAlt) || "";
    name = name.replace(/^\d+\./, "").trim(); // 去掉排行榜编号前缀，如 "1. 书名" → "书名"

    var coverUrl = extractCover(el, S_EXPLORE.coverImg);
    var authorText = legado.dom.selectText(el, S_EXPLORE.authorBlock) || "";
    // 去掉"作者："前缀，并截断括号内的年份/更新信息，如 "作者：张三（2023...）" → "张三"
    var author = authorText
      .replace(/作者[：:]\s*/, "")
      .replace(/\s*[（(]\d{4}[\s\S]*$/, "")
      .trim();

    if (name && bookUrl) {
      books.push({ name: name, author: author, bookUrl: bookUrl, coverUrl: coverUrl, kind: "" });
    }
  }

  // 分类页结构（与搜索页复用 bookbox 卡片）
  if (books.length === 0) {
    items = legado.dom.selectAll(doc, S_EXPLORE.listItem);
    for (var j = 0; j < items.length; j++) {
      var el2 = items[j];
      var bookUrl2 = legado.dom.selectAttr(el2, S_EXPLORE.bookLink, "href");
      if (!bookUrl2) continue;
      bookUrl2 = toAbs(bookUrl2);

      var name2 = legado.dom.selectText(el2, S_EXPLORE.listName) || "";
      var coverUrl2 = extractCover(el2, S_EXPLORE.coverImg);
      var info2 = parseAuthorBlock(legado.dom.selectText(el2, S_EXPLORE.authorBlock));
      var lastChapter2 = legado.dom.selectText(el2, S_EXPLORE.lastChapter) || "";

      if (name2 && bookUrl2) {
        books.push({ name: name2, author: info2.author, bookUrl: bookUrl2, coverUrl: coverUrl2, lastChapter: lastChapter2, kind: info2.kind });
      }
    }
  }

  legado.dom.free(doc);
  return books;
}

async function explore(page, category) {
  legado.log("[explore] page=" + page + " category=" + category);

  // GETALL 是约定的特殊指令，前端调用时用于获取所有可用分类名称列表
  if (category === "GETALL") {
    var names = [];
    for (var i = 0; i < EXPLORE_CATEGORIES.length; i++) {
      names.push(EXPLORE_CATEGORIES[i].name);
    }
    return names;
  }

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

  var url = BASE + cat.path;
  legado.log("[explore] url=" + url);
  var html = await legado.http.get(url);
  return parseBooksFromHtml(html);
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  移植指南 — 如何基于本模板适配新的笔趣阁镜像站
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//
//  步骤 1：复制此文件，重命名为目标站点名称（如 "xxxbiqu.js"）。
//
//  步骤 2：修改文件头部 @name / @url / @logo 元数据。
//
//  步骤 3：按需调整"站点配置"区域的以下常量：
//
//    BASE               — 站点主域名，例如 'https://m.xxxbiqu.com'
//    SEARCH_URL         — 搜索路径模板，{keyword} 占位符会被自动替换
//    CHAPTER_URL_PATTERN — 用于识别合法章节链接的正则，例如 /\/book\d+\/\d+\.html/
//    BOOK_LINK_HREF_KEY — href 属性过滤关键字，例如 '/book'
//
//  步骤 4：核对各选择器对象（S_SEARCH / S_DETAIL / S_TOC / S_CONTENT / S_EXPLORE）
//          是否与新站点 HTML 结构吻合，不匹配的项按实际情况更新。
//
//          常见差异对照表：
//          ┌──────────────────────────────┬──────────────────────────────────────────────┐
//          │ 常量键                       │ 常见备选值 / 说明                             │
//          ├──────────────────────────────┼──────────────────────────────────────────────┤
//          │ S_SEARCH.item                │ '.book-item' / '.result-item'               │
//          │ S_SEARCH.name                │ 'h4 a' / '.title a'                         │
//          │ S_TOC.chapterLink            │ 需精确定位正文目录，排除"最新章节"等干扰区块    │
//          │                              │ 22biqu: '.directoryArea:not(#chapterlist) a'│
//          │                              │ 其他站: '#list dd a' / '.chapter-list a'    │
//          │ S_TOC.reversed               │ false=网站已正序（第1章在前）直接返回         │
//          │                              │ true =网站倒序（最新在前）需 reverse         │
//          │ S_CONTENT.container          │ '#content' / '.chapter-content'             │
//          │ S_CONTENT.paragraph          │ 'p' / 'div.p'                               │
//          │ S_CONTENT.nextPage           │ '.next' / 'a#nextpage'                      │
//          │ S_EXPLORE.rankItem           │ '.rank-item' / '.top-item'                  │
//          └──────────────────────────────┴──────────────────────────────────────────────┘
//
//  步骤 5：更新 EXPLORE_CATEGORIES 中的分类路径。
//
//  步骤 6：如该站点详情页不使用 OGP meta 标签，修改 S_DETAIL 为普通选择器，
//          并在 bookInfo() 内将 selectAttr(..., 'content') 改为 selectText(...)。
//
//  提示：可在"书源调试"面板中逐一测试 search / bookInfo / chapterList /
//        chapterContent / explore，快速验证选择器是否正确。
//
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
