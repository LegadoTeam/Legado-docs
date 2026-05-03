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
| `lastChapter` | `string` | 否 | 旧版最新章节字段，继续兼容 |
| `latestChapter` | `string` | 否 | 最新章节名，优先使用 |
| `latestChapterUrl` | `string` | 否 | 最新章节 URL |
| `wordCount` | `string` | 否 | 字数，保留站点格式，如 `346.16万字` |
| `chapterCount` | `number` | 否 | 章节总数量 |
| `updateTime` | `string` | 否 | 更新时间，保留站点格式 |
| `status` | `string` | 否 | 连载状态，如 `连载中`、`完本` |
| `kind` | `string` | 否 | 分类标签 |

## 元数据规则

- `latestChapter` 是推荐字段；旧书源的 `lastChapter` 仍然兼容。两者同时存在时，界面优先显示 `latestChapter`。
- `latestChapterUrl` 只在当前页面已经能拿到最新章节链接时填写，不要求额外请求。
- `wordCount` 使用字符串，保留站点原始格式，例如 `346.16万字`、`约 80 万字`。
- `chapterCount` 使用数字，只在站点直接提供总章节/总话数/总集数时填写。
- `updateTime` 使用字符串，保留站点原始日期精度，例如 `2026-04-30`、`昨天`。
- `status` 使用字符串，保留站点原文，例如 `连载中`、`完本`、`更新至第12集`。
- `search()` 和 `explore()` 只提取当前列表页或接口已经提供的字段，不要逐本请求 `bookInfo()` 来补齐元数据。

## 各函数中的用法

### search 返回

```js
return [{
  name: '斗破苍穹',
  bookUrl: 'https://example.com/book/123',
  author: '天蚕土豆',
  coverUrl: 'https://example.com/cover/123.jpg',
  intro: '三十年河东，三十年河西...',
  latestChapter: '第1000章',
  wordCount: '346.16万字',
  chapterCount: 1000,
  updateTime: '2026-04-30',
  status: '连载中'
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
  latestChapterUrl: 'https://example.com/chapter/1000',
  wordCount: '346.16万字',
  chapterCount: 1000,
  updateTime: '2026-04-30',
  status: '连载中',
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
  kind: '玄幻',
  latestChapter: '第1000章',
  wordCount: '346.16万字',
  updateTime: '2026-04-30',
  status: '连载中'
}];
```

::: warning 空值处理
字段缺失时填空字符串 `''`，不要返回 `null` 或 `undefined`。
搜索页和发现页只提取当前列表页已经提供的信息，不要为了补齐这些字段逐本请求详情页。
:::
