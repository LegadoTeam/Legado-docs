# 搜索 (search)

`search()` 是用户在搜索框输入关键词时调用的函数。

## 函数签名

```js
async function search(keyword, page) → Promise<BookItem[]>
```

| 参数 | 类型 | 说明 |
|------|------|------|
| `keyword` | `string` | 用户输入的搜索关键词 |
| `page` | `number` | 页码，从 1 开始 |

返回 `BookItem[]` 数组，每个元素包含：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `name` | `string` | ✅ | 书名 |
| `bookUrl` | `string` | ✅ | 书籍详情页 URL |
| `author` | `string` | 推荐 | 作者 |
| `coverUrl` | `string` | 推荐 | 封面图片 URL |
| `intro` | `string` | 否 | 简介 |
| `lastChapter` | `string` | 否 | 旧版最新章节字段 |
| `latestChapter` | `string` | 否 | 最新章节名 |
| `latestChapterUrl` | `string` | 否 | 最新章节 URL |
| `wordCount` | `string` | 否 | 字数 |
| `chapterCount` | `number` | 否 | 章节总数量 |
| `updateTime` | `string` | 否 | 更新时间 |
| `status` | `string` | 否 | 连载状态 |
| `kind` | `string` | 否 | 分类标签 |

完整字段规则见 [BookItem](/api/types-book-item)。新增元数据均为可选字段，旧书源可以继续只返回 `name`、`bookUrl`、`author` 等基础字段。

## HTML 站点示例

```js
async function search(keyword, page) {
  legado.log('[search] keyword=' + keyword + ' page=' + page);

  var html = await legado.http.get(BASE + '/search?q=' + encodeURIComponent(keyword) + '&page=' + page);
  var doc = legado.dom.parse(html);
  var items = legado.dom.selectAll(doc, '.bookbox');
  var books = [];

  for (var i = 0; i < items.length; i++) {
    var el = items[i];
    books.push({
      name: legado.dom.selectText(el, 'h4 a'),
      author: legado.dom.selectText(el, '.author'),
      bookUrl: legado.dom.selectAttr(el, 'h4 a', 'href'),
      coverUrl: legado.dom.selectAttr(el, 'img', 'src'),
      kind: legado.dom.selectText(el, '.category'),
      latestChapter: legado.dom.selectText(el, '.latest a'),
      latestChapterUrl: legado.dom.selectAttr(el, '.latest a', 'href'),
      wordCount: legado.dom.selectText(el, '.words'),
      updateTime: legado.dom.selectText(el, '.updated'),
      status: legado.dom.selectText(el, '.status')
    });
  }

  legado.log('[search] found=' + books.length);
  legado.dom.free(doc);
  return books;
}
```

## JSON API 示例

```js
async function search(keyword, page) {
  legado.log('[search] keyword=' + keyword + ' page=' + page);

  var resp = await legado.http.get(
    BASE + '/api/search?keyword=' + encodeURIComponent(keyword) + '&page=' + page
  );
  var json = JSON.parse(resp);

  return (json.data.list || []).map(function(book) {
    return {
      name: book.title,
      bookUrl: BASE + '/book/' + book.id,
      author: book.author,
      coverUrl: book.cover,
      intro: book.summary,
      latestChapter: book.lastChapter,
      wordCount: book.wordCountText,
      chapterCount: book.chapterCount,
      updateTime: book.updateTime,
      status: book.status
    };
  });
}
```

搜索结果只返回当前搜索接口或列表页已经提供的元数据；不要为了补齐这些字段在 `search()` 中逐本请求详情页。

## POST 搜索

某些站点的搜索需要 POST 请求：

```js
async function search(keyword, page) {
  var body = 'searchkey=' + encodeURIComponent(keyword) + '&page=' + page;
  var html = await legado.http.post(BASE + '/search.php', body);
  var doc = legado.dom.parse(html);
  // ... 解析逻辑
}
```

## GBK 编码

部分老旧站点使用 GBK 编码：

```js
async function search(keyword, page) {
  var encoded = legado.urlEncodeCharset(keyword, 'gbk');
  var html = await legado.http.get(BASE + '/search.php?keyword=' + encoded);
  // ...
}
```

## 封面 URL 兼容

不同站点的图片 URL 可能在不同属性中：

```js
// 兼容 data-src / data-original / src
function getCover(el) {
  return legado.dom.selectAttr(el, 'img', 'data-src')
      || legado.dom.selectAttr(el, 'img', 'data-original')
      || legado.dom.selectAttr(el, 'img', 'src')
      || '';
}
```

::: tip 日志规范
每个函数入口都应打印关键参数日志，方便调试：
```js
legado.log('[search] keyword=' + keyword + ' page=' + page);
```
:::
