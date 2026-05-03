# 书籍详情 (bookInfo)

`bookInfo()` 在用户进入书籍主页时调用，用于获取书籍的详细信息。

## 函数签名

```js
async function bookInfo(bookUrl) → Promise<BookItem>
```

| 参数 | 类型 | 说明 |
|------|------|------|
| `bookUrl` | `string` | 书籍详情页 URL（来自 `search()` 返回的 `bookUrl`） |

返回单个 `BookItem` 对象：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `name` | `string` | ✅ | 书名 |
| `author` | `string` | ✅ | 作者 |
| `bookUrl` | `string` | ✅ | 书籍 URL |
| `tocUrl` | `string` | ✅ | 目录页 URL（可与 bookUrl 相同） |
| `coverUrl` | `string` | 推荐 | 封面图片 URL |
| `intro` | `string` | 推荐 | 书籍简介 |
| `lastChapter` | `string` | 否 | 旧版最新章节字段 |
| `latestChapter` | `string` | 否 | 最新章节名 |
| `latestChapterUrl` | `string` | 否 | 最新章节 URL |
| `wordCount` | `string` | 否 | 字数 |
| `chapterCount` | `number` | 否 | 章节总数量 |
| `updateTime` | `string` | 否 | 更新时间 |
| `status` | `string` | 否 | 连载状态 |
| `kind` | `string` | 否 | 分类标签 |

完整字段规则见 [BookItem](/api/types-book-item)。`bookInfo()` 可以比搜索/发现返回更完整的元数据。

## 基本示例

```js
async function bookInfo(bookUrl) {
  legado.log('[bookInfo] url=' + bookUrl);

  var html = await legado.http.get(bookUrl);
  var doc = legado.dom.parse(html);

  var info = {
    name: legado.dom.selectText(doc, 'h1.book-title'),
    author: legado.dom.selectText(doc, '.author-name'),
    bookUrl: bookUrl,
    tocUrl: bookUrl,
    coverUrl: legado.dom.selectAttr(doc, '.book-cover img', 'src'),
    intro: legado.dom.selectText(doc, '.book-intro'),
    latestChapter: legado.dom.selectText(doc, '.latest-chapter a'),
    latestChapterUrl: legado.dom.selectAttr(doc, '.latest-chapter a', 'href'),
    wordCount: legado.dom.selectText(doc, '.book-words'),
    chapterCount: Number(legado.dom.selectText(doc, '.chapter-count').replace(/\D/g, '')) || 0,
    updateTime: legado.dom.selectText(doc, '.update-time'),
    status: legado.dom.selectText(doc, '.book-status'),
    kind: legado.dom.selectText(doc, '.book-category')
  };

  legado.dom.free(doc);
  return info;
}
```

## 使用 OGP Meta 标签

很多站点通过 [Open Graph](https://ogp.me/) meta 标签提供结构化信息，优先使用：

```js
async function bookInfo(bookUrl) {
  legado.log('[bookInfo] url=' + bookUrl);

  var html = await legado.http.get(bookUrl);
  var doc = legado.dom.parse(html);

  var info = {
    name: legado.dom.selectAttr(doc, '[property="og:novel:book_name"]', 'content')
        || legado.dom.selectAttr(doc, '[property="og:title"]', 'content')
        || legado.dom.selectText(doc, 'h1'),
    author: legado.dom.selectAttr(doc, '[property="og:novel:author"]', 'content')
          || legado.dom.selectText(doc, '.author'),
    bookUrl: bookUrl,
    tocUrl: bookUrl,
    coverUrl: legado.dom.selectAttr(doc, '[property="og:image"]', 'content'),
    intro: legado.dom.selectAttr(doc, '[property="og:description"]', 'content'),
    latestChapter: legado.dom.selectAttr(doc, '[property="og:novel:latest_chapter_name"]', 'content'),
    updateTime: legado.dom.selectAttr(doc, '[property="og:novel:update_time"]', 'content'),
    status: legado.dom.selectAttr(doc, '[property="og:novel:status"]', 'content')
  };

  legado.dom.free(doc);
  return info;
}
```

## tocUrl 说明

- `tocUrl` 是目录页的入口 URL，传给后续的 `chapterList()` 函数
- 很多站点书籍详情页和目录页是同一个 URL，此时 `tocUrl = bookUrl`
- 部分站点目录页是独立 URL，需要从详情页提取

```js
// 目录在独立页面
var tocUrl = legado.dom.selectAttr(doc, 'a.read-btn', 'href');
info.tocUrl = absUrl(tocUrl); // 记得转绝对路径
```

::: warning 拼写兼容
部分站点的"最新章节"字段可能写成 `lastest`（拼写错误），需要兼容：
```js
latestChapter: legado.dom.selectText(doc, '.latest')
            || legado.dom.selectText(doc, '.lastest')
```
:::
