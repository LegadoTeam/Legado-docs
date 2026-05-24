# 段评接口

段评是小说书源的可选扩展。书源实现后，阅读器会在每个相关段落尾部显示评论图标，图标中心展示评论数量；点击后打开底部抽屉查看该段评论详情。

段评图标会参与分页排版。分页模式的覆盖、平移、仿真、无动画都在排版前接收段评数量，避免正文显示后再插入元素导致页面错位。

## 段落序号

段落序号从 `0` 开始，基准是 `chapterContent()` 返回正文按空行/换行切分后的最终段落数组。宿主会把同一份数组传给 `chapterParagraphCommentCounts()` 的 `context.paragraphs`。

范围 key 使用 `${start}+${end}`：

| key   | 含义                         |
| ----- | ---------------------------- |
| `3+3` | 第 4 个段落自己的段评        |
| `3+5` | 覆盖第 4 到第 6 个段落的段评 |

阅读器会把同一结束段落的多个范围合并显示，例如 `3+3` 与 `2+3` 都会显示在第 4 个段落尾部，数量相加。

## 数量接口

```js
async function chapterParagraphCommentCounts(chapterUrl, context) {
  var resp = await legado.http.get(chapterUrl + "?comments=count");
  var json = JSON.parse(resp);

  // 推荐返回对象：key 为范围，值为数量
  return {
    "0+0": json.firstParagraphCount,
    "3+3": 12,
    "6+8": 5,
  };
}
```

`context` 字段如下：

```js
{
  chapterIndex: 0,
  chapterName: '第一章',
  chapterUrl: 'https://example.com/chapter/1',
  sourceType: 'novel',
  paragraphCount: 42,
  paragraphs: ['第一段正文', '第二段正文'],
  contentHash: 'k1x9p0'
}
```

返回值也可以是数组：

```js
return [
  { key: "0+0", count: 3 },
  { start: 3, end: 3, count: 12 },
  { start: 6, end: 8, count: 5 },
];
```

只返回数量，不要在这个接口返回完整评论详情。阅读器会在正文显示前等待支持该接口的书源返回数量。

## 详情接口

用户点击段评图标后，阅读器调用 `chapterParagraphComments()`：

```js
async function chapterParagraphComments(chapterUrl, rangeKey, query) {
  var page = query && query.page ? query.page : 1;
  var pageSize = query && query.pageSize ? query.pageSize : 20;
  var resp = await legado.http.get(
    chapterUrl + "?comments=" + encodeURIComponent(rangeKey) + "&page=" + page,
  );
  var json = JSON.parse(resp);

  return {
    total: json.total,
    comments: json.list.map(function (item) {
      return {
        id: String(item.id),
        nickname: item.user.name,
        avatarUrl: item.user.avatar,
        content: item.content,
        createdAt: item.createdAt,
        likeCount: item.likeCount,
        liked: item.liked,
        replyCount: item.replyCount,
        tags: item.user.isAuthor
          ? [{ label: "作者", type: "primary" }]
          : [{ label: "粉丝 " + item.user.level, type: "success" }],
      };
    }),
  };
}
```

详情中支持的主要字段：

| 字段         | 说明                              |
| ------------ | --------------------------------- |
| `id`         | 评论 ID，点赞和回复会继续传回该值 |
| `nickname`   | 评论人昵称                        |
| `avatarUrl`  | 评论人头像 URL                    |
| `content`    | 评论正文                          |
| `createdAt`  | 评论时间，字符串即可              |
| `likeCount`  | 点赞数量                          |
| `liked`      | 当前用户是否已点赞                |
| `replyCount` | 回复数量                          |
| `tags`       | 昵称后的标签，如 `作者`、粉丝等级 |

`tags` 的单项格式：

```js
{ label: '作者', type: 'primary' }
{ label: '粉丝 Lv.5', type: 'success' }
{ label: '盟主', color: '#d97706' }
```

## 点赞接口

实现 `likeParagraphComment()` 后，抽屉中的点赞按钮会启用：

```js
async function likeParagraphComment(chapterUrl, rangeKey, commentId, liked) {
  await legado.http.post("https://example.com/api/comment/like", {
    body: JSON.stringify({ chapterUrl, rangeKey, commentId, liked }),
    headers: { "Content-Type": "application/json" },
  });
}
```

`liked` 是目标状态：`true` 表示点赞，`false` 表示取消点赞。

## 回复接口

实现 `replyParagraphComment()` 后，抽屉底部回复框会启用：

```js
async function replyParagraphComment(chapterUrl, rangeKey, commentId, content) {
  await legado.http.post("https://example.com/api/comment/reply", {
    body: JSON.stringify({ chapterUrl, rangeKey, commentId, content }),
    headers: { "Content-Type": "application/json" },
  });
}
```

当前版本会把回复提交到该段评列表的第一条评论 ID。书源侧如果需要楼中楼结构，可以把第一条作为根评论处理。

## 最小完整示例

```js
async function chapterContent(chapterUrl) {
  var html = await legado.http.get(chapterUrl);
  var doc = legado.dom.parse(html);
  var text = legado.dom.selectText(doc, "#content");
  legado.dom.free(doc);
  return text;
}

async function chapterParagraphCommentCounts(chapterUrl, context) {
  var raw = await legado.http.get(chapterUrl + "/comment-counts");
  var data = JSON.parse(raw);
  var result = {};

  for (var i = 0; i < context.paragraphCount; i++) {
    var count = data[String(i)] || 0;
    if (count > 0) {
      result[i + "+" + i] = count;
    }
  }

  return result;
}

async function chapterParagraphComments(chapterUrl, rangeKey, query) {
  var page = (query && query.page) || 1;
  var raw = await legado.http.get(
    chapterUrl + "/comments/" + rangeKey + "?page=" + page,
  );
  return JSON.parse(raw);
}
```

## 实现建议

- counts 接口只做轻量请求，避免拉完整评论列表。
- 不要自行重新切分正文推断段落，优先使用 `context.paragraphs` 和 `context.paragraphCount`。
- 如果站点段评绑定的是字符偏移，建议在书源侧映射到宿主给出的段落数组后再返回 `${start}+${end}`。
- 没有登录态或站点不支持时，可以只实现 counts 和详情；点赞、回复函数不实现时按钮会自动禁用。
- 段评接口目前只用于小说正文，漫画、视频、音乐/有声书源不会调用。
