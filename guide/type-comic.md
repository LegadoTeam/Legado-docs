# 漫画书源（comic）

漫画书源需要在元数据中标记 `// @type comic`。

## 关键差异

- 必须标记 `// @type comic`（中文别名：`漫画`）
- `chapterContent()` 返回 `JSON.stringify(imageUrls)`（图片 URL 数组）
- 可选实现 `prepareImage()` 钩子：每张图片下载**前**调用，可覆盖 URL 和/或注入请求头（Referer、Origin 等）
- 可选实现 `processImage()` 回调：每张图片下载**后**调用，用于解密、拼接还原等
- 第 1 话如果 `href="javascript:;"`，需映射为 `tocUrl`

## 完整示例

```js
// @name        示例漫画站
// @version     1.0.0
// @author      开发者
// @url         https://www.example.com
// @type        comic
// @enabled     true
// @tags        免费,漫画
// @description 示例漫画书源

var BASE = 'https://www.example.com';

async function search(keyword, page) {
  var html = await legado.http.get(BASE + '/search?q=' + encodeURIComponent(keyword));
  var doc = legado.dom.parse(html);
  var items = legado.dom.selectAll(doc, '.manga-item');
  var books = [];
  for (var i = 0; i < items.length; i++) {
    books.push({
      name: legado.dom.selectText(items[i], '.title'),
      author: legado.dom.selectText(items[i], '.author'),
      bookUrl: absUrl(legado.dom.selectAttr(items[i], 'a', 'href')),
      coverUrl: legado.dom.selectAttr(items[i], 'img', 'data-src'),
      latestChapter: legado.dom.selectText(items[i], '.latest a'),
      latestChapterUrl: legado.dom.selectAttr(items[i], '.latest a', 'href'),
      chapterCount: Number(legado.dom.selectText(items[i], '.chapter-count').replace(/\D/g, '')) || 0,
      updateTime: legado.dom.selectText(items[i], '.updated'),
      status: legado.dom.selectText(items[i], '.status')
    });
  }
  legado.dom.free(doc);
  return books;
}

async function bookInfo(bookUrl) {
  var html = await legado.http.get(bookUrl);
  var doc = legado.dom.parse(html);
  var info = {
    name: legado.dom.selectText(doc, 'h1'),
    author: legado.dom.selectText(doc, '.author'),
    bookUrl: bookUrl,
    tocUrl: bookUrl,
    coverUrl: legado.dom.selectAttr(doc, '.cover img', 'src'),
    intro: legado.dom.selectText(doc, '.intro'),
    latestChapter: legado.dom.selectText(doc, '.latest a'),
    latestChapterUrl: legado.dom.selectAttr(doc, '.latest a', 'href'),
    chapterCount: Number(legado.dom.selectText(doc, '.chapter-count').replace(/\D/g, '')) || 0,
    updateTime: legado.dom.selectText(doc, '.updated'),
    status: legado.dom.selectText(doc, '.status')
  };
  legado.dom.free(doc);
  return info;
}

async function chapterList(tocUrl) {
  var html = await legado.http.get(tocUrl);
  var doc = legado.dom.parse(html);
  var items = legado.dom.selectAll(doc, '.chapter-list a');
  var chapters = [];
  for (var i = 0; i < items.length; i++) {
    var href = legado.dom.attr(items[i], 'href');
    // 跳过 javascript:; 链接，或映射为 tocUrl
    if (!href || href === 'javascript:;' || href === 'javascript:void(0)') {
      href = tocUrl;
    }
    chapters.push({
      name: legado.dom.text(items[i]),
      url: absUrl(href)
    });
  }
  legado.dom.free(doc);
  return chapters;
}

async function chapterContent(chapterUrl) {
  legado.log('[content] url=' + chapterUrl);
  var html = await legado.http.get(chapterUrl);
  var doc = legado.dom.parse(html);

  // 常见漫画图片选择器
  var urls = legado.dom.selectAllAttrs(doc, '.comic-page img', 'data-src');
  if (!urls.length) urls = legado.dom.selectAllAttrs(doc, '.comic-page img', 'src');
  if (!urls.length) urls = legado.dom.selectAllAttrs(doc, '#imgsec img', 'data-src');
  if (!urls.length) urls = legado.dom.selectAllAttrs(doc, '.page img', 'src');

  legado.dom.free(doc);
  legado.log('[content] images=' + urls.length);
  return JSON.stringify(urls);
}

function absUrl(path) {
  if (!path) return '';
  if (path.indexOf('http') === 0) return path;
  return BASE + (path.charAt(0) === '/' ? '' : '/') + path;
}
```

## processImage 回调

如果漫画图片经过加密（如打乱分割），可以定义 `processImage()` 函数进行还原：

```js
function processImage(base64Data, pageIndex, imageUrl) {
  // base64Data: 原始图片的 base64 编码
  // pageIndex: 图片索引（从 0 开始）
  // imageUrl: 原始图片 URL（含 fragment 信息）

  var img = legado.image.decode(base64Data);
  var w = legado.image.width(img);
  var h = legado.image.height(img);

  // 示例：上下翻转还原
  var dest = legado.image.create(w, h);
  var sliceH = Math.floor(h / 10);
  for (var i = 0; i < 10; i++) {
    legado.image.copyRegion(img, dest, 0, i * sliceH, w, sliceH, 0, (9 - i) * sliceH);
  }

  var result = legado.image.encode(dest, 'jpg');
  legado.image.free(img);
  legado.image.free(dest);
  return result; // 返回 base64 字符串，返回 null 则保留原图
}
```

::: info processImage 触发条件
- 漫画图片缓存模式开启时（`comic_cache_enabled = true`），Rust 下载每张图片后自动检测并调用
- 书源未定义 `processImage` → 保持原有轻量异步下载路径
- 返回 `null` → 保持原始图片不处理
:::

## prepareImage 钩子（请求头控制）

图片由 Rust 后台下载，`chapterContent` 中设置的 headers 对图片请求**无效**。若需要控制图片下载的 `Referer`、`Origin` 或覆盖 URL，定义 `prepareImage` 函数：

```js
// 注入防盗链所需的 Referer / Origin
function prepareImage(url, pageIndex) {
  return {
    headers: {
      'Referer': BASE + '/',
      'Origin': BASE
    }
  };
}
```

| 返回字段 | 说明 |
|----------|------|
| `url` | 覆盖实际下载地址（省略则使用原始 URL） |
| `headers` | 追加/覆盖请求头（同名键覆盖，新键追加） |

**默认 Referer 行为**：未定义 `prepareImage` 时，Referer 填充为章节 URL。若章节 URL 是非 HTTP 格式（如管道分隔键），服务器会收到无效 Referer，可能触发防盗链。

## 两个钩子的执行顺序

```
prepareImage(url, i)          → 确定下载 URL 和请求头（Phase 1，串行）
  ↓ Rust 并发下载图片
processImage(base64, i, url)  → 解密/拼接处理（Phase 3，串行）
```

只定义其中一个完全合法。同时定义时共用同一 Boa 引擎实例，但两者执行阶段不同。

::: tip 详细文档
完整 API 参考与更多示例见 [advanced/process-image](../advanced/process-image.md)
:::
