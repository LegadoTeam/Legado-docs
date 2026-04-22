# 章节目录 (chapterList)

`chapterList()` 用于获取书籍的所有章节列表。

## 函数签名

```js
async function chapterList(tocUrl) → Promise<ChapterInfo[]>
```

| 参数 | 类型 | 说明 |
|------|------|------|
| `tocUrl` | `string` | 目录页 URL（来自 `bookInfo()` 返回的 `tocUrl`） |

返回 `ChapterInfo[]` 数组，**必须正序排列**（第一章在前）：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `name` | `string` | ✅ | 章节名 |
| `url` | `string` | ✅ | 章节 URL |
| `group` | `string` | 否 | 分组名（视频多线路时使用） |

## 基本示例

```js
async function chapterList(tocUrl) {
  legado.log('[chapterList] url=' + tocUrl);

  var html = await legado.http.get(tocUrl);
  var doc = legado.dom.parse(html);

  var names = legado.dom.selectAllTexts(doc, '#list dd a');
  var urls = legado.dom.selectAllAttrs(doc, '#list dd a', 'href');

  var chapters = [];
  for (var i = 0; i < names.length; i++) {
    chapters.push({ name: names[i], url: urls[i] });
  }

  legado.log('[chapterList] count=' + chapters.length);
  legado.dom.free(doc);
  return chapters;
}
```

## 多页目录

### 方式一：`<select>` 分页 + `batchGet`

适用于目录分多页、页码通过 `<select>` 列出的站点：

```js
async function chapterList(tocUrl) {
  var html = await legado.http.get(tocUrl);
  var doc = legado.dom.parse(html);

  // 提取分页 URL
  var pageUrls = legado.dom.selectAllAttrs(doc, 'select.chapter-page option', 'value');
  legado.dom.free(doc);

  if (pageUrls.length <= 1) {
    return parseChaptersFromHtml(html);
  }

  // 并发请求所有分页
  var results = await legado.http.batchGet(pageUrls);
  var chapters = [];
  for (var i = 0; i < results.length; i++) {
    if (results[i].ok) {
      chapters = chapters.concat(parseChaptersFromHtml(results[i].data));
    }
  }
  return chapters;
}
```

### 方式二：「下一页」翻页

```js
async function chapterList(tocUrl) {
  var MAX_PAGES = 50; // 防死循环
  var chapters = [];
  var currentUrl = tocUrl;
  var visited = {};

  for (var p = 0; p < MAX_PAGES; p++) {
    if (visited[currentUrl]) break;
    visited[currentUrl] = true;

    var html = await legado.http.get(currentUrl);
    var doc = legado.dom.parse(html);

    // 解析当前页章节
    var names = legado.dom.selectAllTexts(doc, '.chapter-list a');
    var urls = legado.dom.selectAllAttrs(doc, '.chapter-list a', 'href');
    for (var i = 0; i < names.length; i++) {
      chapters.push({ name: names[i], url: urls[i] });
    }

    // 查找下一页
    var nextLink = legado.dom.selectByText(doc, '下一页');
    var nextUrl = nextLink ? legado.dom.attr(nextLink, 'href') : null;
    legado.dom.free(doc);

    if (!nextUrl || nextUrl === currentUrl) break;
    currentUrl = nextUrl;
  }

  return chapters;
}
```

## URL 去重

确保不会返回重复的章节：

```js
var seen = {};
var chapters = [];
for (var i = 0; i < names.length; i++) {
  if (!seen[urls[i]]) {
    seen[urls[i]] = true;
    chapters.push({ name: names[i], url: urls[i] });
  }
}
```

## 倒序处理

如果网站默认倒序（最新章节在前），需要反转：

```js
chapters.reverse();
```

::: danger 必须正序
`chapterList()` 返回的数组**必须按正序排列**（第一章在最前面）。如果网站返回倒序，请务必调用 `reverse()`。
:::
