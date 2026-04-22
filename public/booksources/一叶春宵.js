// @name        一叶春宵
// @version     1.0.0
// @author      legado-tauri
// @url         https://www.yiyechunxiao.com
// @type        novel
// @enabled     true
// @tags        言情,现代
// @description 一叶春宵小说网（含成人内容）

var BASE = "https://www.yiyechunxiao.com";

/**
 * 从 /tags/ 页面获取所有标签，返回 { name: tagPath } 映射
 * tagPath 如 '/tag/60/'
 */
async function _fetchTagMap() {
  var html = await legado.http.get(BASE + "/tags/");
  var doc = legado.dom.parse(html);
  var names = legado.dom.selectAllTexts(doc, ".tag-list a");
  var hrefs = legado.dom.selectAllAttrs(doc, ".tag-list a", "href");
  var map = {};
  for (var i = 0; i < names.length; i++) {
    // 去掉名称中的数字和"部"后缀，如 "调教11767 部" → "调教"
    var name = names[i].replace(/[\d\s]*部$/, "").trim();
    if (name && hrefs[i]) {
      map[name] = hrefs[i];
    }
  }
  return map;
}

/**
 * 发现页
 * category === 'GETALL' 时返回标签名数组
 * 否则返回该标签下的书籍列表
 */
async function explore(page, category) {
  legado.log("explore page=" + page + " category=" + category);
  var tagMap = await _fetchTagMap();

  if (!category || category === "GETALL") {
    var cats = [];
    cats.push("热门小说");
    for (var k in tagMap) {
      if (tagMap.hasOwnProperty(k)) {
        cats.push(k);
      }
    }
    legado.log("分类数量: " + cats.length);
    return cats;
  }

  var tagPath = tagMap[category];
  if (category === "热门小说") {
    tagPath = "/rank/hot/";
  } else if (!tagPath) {
    legado.log("未找到分类: " + category);
    return [];
  }

  var url = BASE + tagPath + "?page=" + (page || 1);
  legado.log("请求分类页: " + url);
  var html = await legado.http.get(url);
  var doc = legado.dom.parse(html);

  return _parseNovelList(doc);
}

/**
 * 解析 .novel-list 的书籍列表（分类页格式）
 */
function _parseNovelList(doc) {
  var items = legado.dom.selectAll(doc, ".novel-list a");
  var result = [];
  for (var i = 0; i < items.length; i++) {
    var el = items[i];
    var href = legado.dom.attr(el, "href");
    if (!href || href.indexOf("/book/") < 0) continue;
    var name = legado.dom.selectText(el, "h4");
    var author = legado.dom.selectText(el, "span");
    var coverRel = legado.dom.selectAttr(el, "img", "data-src");
    result.push({
      name: name || "",
      author: author || "",
      bookUrl: BASE + href,
      coverUrl: coverRel ? BASE + coverRel : "",
    });
  }
  return result;
}

/**
 * 书籍详情
 */
async function bookInfo(bookUrl) {
  legado.log("bookInfo: " + bookUrl);
  var html = await legado.http.get(bookUrl);
  var doc = legado.dom.parse(html);

  var name = legado.dom.selectText(doc, "h1");
  // 作者在第一个 dl dd 中
  var ddAll = legado.dom.selectAllTexts(doc, "dl dd");
  var author = ddAll.length > 0 ? ddAll[0] : "";
  // 分类在第三个 dl dd
  var kind = ddAll.length > 2 ? ddAll[2] : "";
  // 最新章节在最后一个 dl dd
  var lastChapter = ddAll.length > 0 ? ddAll[ddAll.length - 1] : "";

  var coverRel = legado.dom.selectAttr(doc, ".cover img", "src");
  // 封面懒加载时用 data-src
  if (!coverRel || coverRel.indexOf("/static/img/thumb") >= 0) {
    coverRel = legado.dom.selectAttr(doc, ".cover img", "data-src");
  }
  var coverUrl = coverRel ? (coverRel.indexOf("http") === 0 ? coverRel : BASE + coverRel) : "";

  var intro = legado.dom.selectText(doc, ".desc");

  // 目录页在 bookUrl + 'list/'
  var tocUrl = bookUrl.replace(/\/$/, "") + "/list/";

  legado.log("bookInfo name=" + name + " author=" + author);
  return {
    name: name || "",
    author: author || "",
    coverUrl: coverUrl,
    intro: (intro || "").trim(),
    kind: kind || "",
    lastChapter: lastChapter || "",
    tocUrl: tocUrl,
  };
}

/**
 * 章节目录（目录在独立的 list/ 页面）
 */
async function chapterList(tocUrl) {
  legado.log("chapterList: " + tocUrl);
  var html = await legado.http.get(tocUrl);
  var doc = legado.dom.parse(html);

  var items = legado.dom.selectAll(doc, ".chapter-list a");
  var hrefs = legado.dom.selectAllAttrs(doc, ".chapter-list a", "href");
  var names = legado.dom.selectAllTexts(doc, ".chapter-list a");

  var chapters = [];
  for (var i = 0; i < names.length; i++) {
    if (!hrefs[i] || hrefs[i].indexOf("/book/") < 0) continue;
    chapters.push({
      name: names[i] || "第" + (i + 1) + "章",
      url: BASE + hrefs[i],
    });
  }
  legado.log("章节数: " + chapters.length);
  return chapters;
}

/**
 * 章节正文
 */
async function chapterContent(chapterUrl) {
  legado.log("chapterContent: " + chapterUrl);
  var html = await legado.http.get(chapterUrl);
  var doc = legado.dom.parse(html);

  // 移除广告节点
  legado.dom.remove(doc, "script, .ad, .tips, .readinline");

  var content = legado.dom.selectText(doc, ".content");
  if (!content) {
    legado.log("正文容器未找到");
    return "";
  }
  // 清理常见噪声
  content = content.replace(/本章未完.*?下一页/g, "");
  content = content.replace(/\u5c0f\u8bf4\u7f51\u7ad9|www\.\S+/gi, "");
  return content.trim();
}

/**
 * 搜索
 */
async function search(keyword, page) {
  legado.log("search: " + keyword + " page=" + page);
  var url = BASE + "/search/?q=" + encodeURIComponent(keyword);
  if (page && page > 1) {
    url += "&page=" + page;
  }
  var html = await legado.http.get(url);
  var doc = legado.dom.parse(html);

  var items = legado.dom.selectAll(doc, ".novel-item");
  var result = [];
  for (var i = 0; i < items.length; i++) {
    var el = items[i];
    var titleEl = legado.dom.select(el, ".title");
    var coverEl = legado.dom.select(el, ".cover img");
    if (!titleEl) continue;
    var name = legado.dom.text(titleEl);
    var href = legado.dom.attr(titleEl, "href");
    var author = legado.dom.selectText(el, ".author");
    var coverRel = coverEl ? legado.dom.attr(coverEl, "data-src") : null;
    if (!href) continue;
    result.push({
      name: name || "",
      author: author || "",
      bookUrl: BASE + href,
      coverUrl: coverRel ? BASE + coverRel : "",
    });
  }
  legado.log("搜索结果: " + result.length);
  return result;
}

/**
 * 内置测试函数
 */
async function TEST(type) {
  if (type === "__list__") return ["search", "explore"];
  if (type === "search") {
    var r = await search("系统", 1);
    if (!r || r.length < 1) return { passed: false, message: "搜索无结果" };
    return { passed: true, message: "搜索返回 " + r.length + " 条" };
  }
  if (type === "explore") {
    var cats = await explore(1, "GETALL");
    if (!cats || cats.length < 1) return { passed: false, message: "发现页分类为空" };
    var books = await explore(1, cats[0]);
    if (!books || books.length < 1) return { passed: false, message: "发现页书籍为空" };
    return { passed: true, message: "分类 " + cats.length + " 个，书籍 " + books.length + " 条" };
  }
  return { passed: false, message: "未知测试: " + type };
}
