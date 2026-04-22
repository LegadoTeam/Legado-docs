# BookItem

`search()`、`bookInfo()`、`explore()` 返回的书籍数据结构。

## 字段

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `name` | `string` | ✅ | 书名 |
| `bookUrl` | `string` | ✅ | 书籍详情页 URL |
| `author` | `string` | 推荐 | 作者（视频源可填导演/主演） |
| `coverUrl` | `string` | 推荐 | 封面图片 URL |
| `tocUrl` | `string` | `bookInfo` 中必填 | 目录页 URL |
| `intro` | `string` | 否 | 简介 |
| `latestChapter` | `string` | 否 | 最新章节名 |
| `kind` | `string` | 否 | 分类标签 |

## 各函数中的用法

### search 返回

```js
return [{
  name: '斗破苍穹',
  bookUrl: 'https://example.com/book/123',
  author: '天蚕土豆',
  coverUrl: 'https://example.com/cover/123.jpg',
  intro: '三十年河东，三十年河西...',
  latestChapter: '第1000章'
}];
```

### bookInfo 返回

```js
return {
  name: '斗破苍穹',
  bookUrl: bookUrl,
  tocUrl: bookUrl + '/chapters',   // 目录入口
  author: '天蚕土豆',
  coverUrl: 'https://example.com/cover/123.jpg',
  intro: '三十年河东，三十年河西...',
  latestChapter: '第1000章',
  kind: '玄幻'
};
```

### explore 返回

```js
return [{
  name: '斗破苍穹',
  bookUrl: 'https://example.com/book/123',
  author: '天蚕土豆',
  coverUrl: 'https://example.com/cover/123.jpg',
  kind: '玄幻'
}];
```

::: warning 空值处理
字段缺失时填空字符串 `''`，不要返回 `null` 或 `undefined`。
:::
