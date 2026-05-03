# 发现页 (explore)

`explore()` 是可选函数，用于提供分类浏览入口。不实现此函数时，发现页自动跳过该书源。

## 函数签名

```js
async function explore(page, category) → Promise<string[] | BookItem[] | { type: 'html', html: string }>
```

| 参数 | 类型 | 说明 |
|------|------|------|
| `page` | `number` | 页码，从 1 开始 |
| `category` | `string` | 分类名，或 `'GETALL'` 表示获取所有分类 |

### 返回值

| 调用场景 | 返回类型 | 说明 |
|---------|---------|------|
| `category === 'GETALL'` | `string[]` | 分类名数组 |
| 指定分类名 | `BookItem[]` | 该分类下的书籍列表 |
| 特殊分类（如"设置"） | `{ type: 'html', html: '...' }` | HTML 交互页面 |

`BookItem` 的完整字段规则见 [BookItem](/api/types-book-item)。发现页元数据字段与搜索页一致。

## 基本示例

```js
async function explore(page, category) {
  // 返回分类列表
  if (category === 'GETALL') {
    return ['玄幻', '仙侠', '都市', '历史', '科幻'];
  }

  // 返回指定分类下的书籍
  legado.log('[explore] category=' + category + ' page=' + page);
  var html = await legado.http.get(BASE + '/category/' + encodeURIComponent(category) + '?page=' + page);
  var doc = legado.dom.parse(html);
  var items = legado.dom.selectAll(doc, '.book-item');
  var books = [];

  for (var i = 0; i < items.length; i++) {
    books.push({
      name: legado.dom.selectText(items[i], '.title'),
      author: legado.dom.selectText(items[i], '.author'),
      bookUrl: legado.dom.selectAttr(items[i], 'a', 'href'),
      coverUrl: legado.dom.selectAttr(items[i], 'img', 'src'),
      kind: category,
      latestChapter: legado.dom.selectText(items[i], '.latest a'),
      latestChapterUrl: legado.dom.selectAttr(items[i], '.latest a', 'href'),
      wordCount: legado.dom.selectText(items[i], '.words'),
      updateTime: legado.dom.selectText(items[i], '.updated'),
      status: legado.dom.selectText(items[i], '.status')
    });
  }

  legado.dom.free(doc);
  return books;
}
```

发现页只返回当前分类页已经提供的元数据；不要为了补齐字数、章节数、状态或更新时间在 `explore()` 中逐本请求详情页。

## JSON API 发现页

```js
var CATEGORIES = {
  '玄幻': 1, '仙侠': 2, '都市': 3, '历史': 4
};

async function explore(page, category) {
  if (category === 'GETALL') {
    return Object.keys(CATEGORIES);
  }

  var catId = CATEGORIES[category];
  var resp = await legado.http.get(BASE + '/api/list?cid=' + catId + '&page=' + page);
  var json = JSON.parse(resp);

  return json.data.list.map(function(book) {
    return {
      name: book.title,
      bookUrl: BASE + '/book/' + book.id,
      author: book.author,
      coverUrl: book.cover,
      kind: category,
      latestChapter: book.lastChapter,
      wordCount: book.wordCountText,
      chapterCount: book.chapterCount,
      updateTime: book.updateTime,
      status: book.status
    };
  });
}
```

## 排行榜 + 分类混合

```js
async function explore(page, category) {
  if (category === 'GETALL') {
    return ['总人气排行', '月排行榜', '周排行榜', '玄幻', '仙侠', '都市'];
  }

  var url;
  switch (category) {
    case '总人气排行': url = BASE + '/top/allvisit/' + page + '.htm'; break;
    case '月排行榜':   url = BASE + '/top/monthvisit/' + page + '.htm'; break;
    case '周排行榜':   url = BASE + '/top/weekvisit/' + page + '.htm'; break;
    default:          url = BASE + '/sort/' + category + '/' + page + '.htm'; break;
  }

  var html = await legado.http.get(url);
  // ... 解析逻辑
}
```

::: tip HTML 交互发现页
`explore()` 还支持返回 HTML 交互页面，用于实现高级的用户交互（如设置面板、筛选器）。详见 [进阶 → HTML 交互发现页](/advanced/html-explore)。
:::
