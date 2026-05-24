# 小说书源（novel）

小说是默认的书源类型，英文标识为 `novel`，可省略 `@type` 或显式标记 `// @type novel`。

## 特点

- `chapterContent()` 返回纯文本字符串
- 段落间用 `\n` 分隔
- 需要过滤广告噪声文本
- 可能需要处理多页正文
- 付费站点可在章节中标记 `vip`、`price`、`currency`，并实现可选的 `purchaseChapter()`

## 完整示例

```js
// @name        示例小说站
// @version     1.0.0
// @author      开发者
// @url         https://www.example.com
// @enabled     true
// @tags        免费,小说
// @description 示例小说书源

var BASE = "https://www.example.com";

async function search(keyword, page) {
  var html = await legado.http.get(
    BASE + "/search?q=" + encodeURIComponent(keyword) + "&page=" + page,
  );
  var doc = legado.dom.parse(html);
  var items = legado.dom.selectAll(doc, ".result-item");
  var books = [];
  for (var i = 0; i < items.length; i++) {
    books.push({
      name: legado.dom.selectText(items[i], ".title"),
      author: legado.dom.selectText(items[i], ".author"),
      bookUrl: absUrl(legado.dom.selectAttr(items[i], "a", "href")),
      coverUrl: legado.dom.selectAttr(items[i], "img", "src"),
      latestChapter: legado.dom.selectText(items[i], ".latest a"),
      latestChapterUrl: legado.dom.selectAttr(items[i], ".latest a", "href"),
      wordCount: legado.dom.selectText(items[i], ".words"),
      updateTime: legado.dom.selectText(items[i], ".updated"),
      status: legado.dom.selectText(items[i], ".status"),
    });
  }
  legado.dom.free(doc);
  return books;
}

async function bookInfo(bookUrl) {
  var html = await legado.http.get(bookUrl);
  var doc = legado.dom.parse(html);
  var info = {
    name: legado.dom.selectText(doc, "h1"),
    author: legado.dom.selectText(doc, ".author"),
    bookUrl: bookUrl,
    tocUrl: bookUrl,
    coverUrl: legado.dom.selectAttr(doc, ".cover img", "src"),
    intro: legado.dom.selectText(doc, ".intro"),
    latestChapter: legado.dom.selectText(doc, ".latest a"),
    latestChapterUrl: legado.dom.selectAttr(doc, ".latest a", "href"),
    wordCount: legado.dom.selectText(doc, ".words"),
    chapterCount:
      Number(legado.dom.selectText(doc, ".chapter-count").replace(/\D/g, "")) ||
      0,
    updateTime: legado.dom.selectText(doc, ".updated"),
    status: legado.dom.selectText(doc, ".status"),
  };
  legado.dom.free(doc);
  return info;
}

async function chapterList(tocUrl) {
  var html = await legado.http.get(tocUrl);
  var doc = legado.dom.parse(html);
  var names = legado.dom.selectAllTexts(doc, "#list a");
  var urls = legado.dom.selectAllAttrs(doc, "#list a", "href");
  var chapters = [];
  for (var i = 0; i < names.length; i++) {
    chapters.push({ name: names[i], url: absUrl(urls[i]), vip: false });
  }
  legado.dom.free(doc);
  return chapters;
}

async function chapterContent(chapterUrl) {
  var html = await legado.http.get(chapterUrl);
  var doc = legado.dom.parse(html);
  var text = legado.dom.selectText(doc, "#content");
  legado.dom.free(doc);
  return cleanNoise(text);
}

// 可选：仅在用户确认购买 VIP 章节后由应用调用
async function purchaseChapter(chapterUrl, chapter) {
  var body = JSON.stringify({
    chapterUrl: chapterUrl,
    chapterName: chapter && chapter.name,
  });
  var resp = await legado.http.post(BASE + "/buy", body, {
    "Content-Type": "application/json",
  });
  var json = JSON.parse(resp);
  return { ok: !!json.success, message: json.message };
}

// ── 工具函数 ──
function absUrl(path) {
  if (!path) return "";
  if (path.indexOf("http") === 0) return path;
  return BASE + (path.charAt(0) === "/" ? "" : "/") + path;
}

function cleanNoise(text) {
  if (!text) return "";
  return text
    .replace(
      /本章未完|加入书签|章节报错|请收藏|最快更新|手机阅读|天才一秒记住/g,
      "",
    )
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
```
