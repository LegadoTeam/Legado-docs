# 快速开始

本节将带你从零创建一个最小可用的书源文件。

## 前置条件

- 已安装 Legado Tauri 应用
- 了解基本的 JavaScript 和 CSS 选择器语法

## 创建书源文件

在应用的书源目录中创建一个 `.js` 文件（如 `我的书源.js`），或使用应用内的书源编辑器。

## 最小模板

```js
// @name        我的书源
// @version     1.0.0
// @author      你的名字
// @url         https://www.example.com
// @logo        https://www.example.com/favicon.ico
// @enabled     true
// @description 示例书源

var BASE = 'https://www.example.com';

// ── 搜索 ─────────────────────────────────────────
async function search(keyword, page) {
  var html = await legado.http.get(BASE + '/search?q=' + encodeURIComponent(keyword) + '&page=' + page);
  var doc = legado.dom.parse(html);
  var items = legado.dom.selectAll(doc, '.book-item');
  var books = [];
  for (var i = 0; i < items.length; i++) {
    books.push({
      name: legado.dom.selectText(items[i], '.title'),
      author: legado.dom.selectText(items[i], '.author'),
      bookUrl: legado.dom.selectAttr(items[i], 'a', 'href'),
      coverUrl: legado.dom.selectAttr(items[i], 'img', 'src')
    });
  }
  legado.dom.free(doc);
  return books;
}

// ── 书籍详情 ─────────────────────────────────────
async function bookInfo(bookUrl) {
  var html = await legado.http.get(bookUrl);
  var doc = legado.dom.parse(html);
  var info = {
    name: legado.dom.selectText(doc, 'h1'),
    author: legado.dom.selectText(doc, '.author'),
    coverUrl: legado.dom.selectAttr(doc, '.cover img', 'src'),
    intro: legado.dom.selectText(doc, '.intro'),
    tocUrl: bookUrl
  };
  legado.dom.free(doc);
  return info;
}

// ── 章节目录 ─────────────────────────────────────
async function chapterList(tocUrl) {
  var html = await legado.http.get(tocUrl);
  var doc = legado.dom.parse(html);
  var names = legado.dom.selectAllTexts(doc, '.chapter-list a');
  var urls = legado.dom.selectAllAttrs(doc, '.chapter-list a', 'href');
  var chapters = [];
  for (var i = 0; i < names.length; i++) {
    chapters.push({ name: names[i], url: urls[i] });
  }
  legado.dom.free(doc);
  return chapters;
}

// ── 章节正文 ─────────────────────────────────────
async function chapterContent(chapterUrl) {
  var html = await legado.http.get(chapterUrl);
  var doc = legado.dom.parse(html);
  var text = legado.dom.selectText(doc, '#content');
  legado.dom.free(doc);
  return text;
}
```

## 验证书源

使用 CLI 工具逐步测试：

```bash
# 测试搜索
legado_tauri cli booksource-test ./我的书源.js search 斗破苍穹

# 测试全部功能
legado_tauri cli booksource-test ./我的书源.js all 斗破苍穹
```

或在应用内打开「书源管理 → 调试」面板进行可视化调试。

## 两种网站类型

### HTML 站点

大多数网站使用 HTML 页面，通过 `legado.http.get()` 获取 HTML 后，使用 `legado.dom.*` 解析：

```js
var html = await legado.http.get(url);
var doc = legado.dom.parse(html);
var title = legado.dom.selectText(doc, 'h1.title');
legado.dom.free(doc);
```

### JSON API 站点

部分站点提供 JSON API，直接 `JSON.parse()` 即可：

```js
var resp = await legado.http.get('https://api.example.com/books?q=' + keyword);
var data = JSON.parse(resp);
return data.list.map(function(item) {
  return { name: item.title, bookUrl: item.url };
});
```

## 下一步

- [书源文件结构](/guide/file-structure) — 了解完整的文件格式规范
- [API 参考](/api/) — 查看所有可用 API
