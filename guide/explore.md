# 发现页 (explore)

`explore()` 是可选函数，用于提供分类浏览入口。不实现此函数时，发现页自动跳过该书源。

## 函数签名

```js
async function explore(page, category) → Promise<string[] | ExploreCategory[] | BookItem[] | { type: 'html', html: string }>
```

| 参数 | 类型 | 说明 |
|------|------|------|
| `page` | `number` | 页码，从 1 开始 |
| `category` | `string` | 分类名、分类 URL，或 `'GETALL'` 表示获取所有分类 |

### 返回值

| 调用场景 | 返回类型 | 说明 |
|---------|---------|------|
| `category === 'GETALL'` | `string[] \| ExploreCategory[]` | 分类数组；推荐返回对象数组以区分同名分类 |
| 指定分类名或 URL | `BookItem[]` | 该分类下的书籍列表 |
| 特殊分类（如"设置"） | `{ type: 'html', html: '...' }` | HTML 交互页面 |

`BookItem` 的完整字段规则见 [BookItem](/api/types-book-item)。发现页元数据字段与搜索页一致。

`ExploreCategory` 结构如下：

```ts
interface ExploreCategory {
  /** 前端显示的分类名称 */
  name: string;
  /** 实际传回 explore(page, category) 的稳定分类值，可为 URL、ID 或筛选参数 */
  url: string;
  /** 可选。移动端分类入口宽度提示，桌面端暂不使用 */
  style?: {
    layout_flexGrow?: number;
    layout_flexBasisPercent?: number; // 1=100%，0.4=40%，0.25=25%
  };
}
```

为兼容旧书源，`GETALL` 仍可返回 `string[]`。如果存在多个同名入口，应返回 `{ name, url }` 对象数组；前端显示 `name`，加载时传 `url`，因此同名分类不会互相覆盖。

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

## 同名分类与移动端宽度

旧阅读的发现入口常用 `标题::URL::宽度` 或 FlexBox JSON 描述分类布局。新书源可以直接返回对象数组：

```js
async function explore(page, category) {
  var cats = [
    { name: '畅销榜', url: BASE + '/api/rank?tid=75&rid=1&page={{page}}', style: { layout_flexGrow: 1, layout_flexBasisPercent: 1 } },
    { name: '古代', url: BASE + '/api/rank?tid=3&rid=1&page={{page}}', style: { layout_flexGrow: 1, layout_flexBasisPercent: 0.25 } },
    { name: '古代', url: BASE + '/api/rank?tid=3&rid=2&page={{page}}', style: { layout_flexGrow: 1, layout_flexBasisPercent: 0.25 } }
  ];

  if (category === 'GETALL') {
    return cats;
  }

  var selected = cats.find(function(cat) {
    return cat.url === category || cat.name === category;
  });
  if (!selected) return [];

  var resp = await legado.http.get(selected.url.replace('{{page}}', page));
  // ... 解析逻辑
}
```

移动端会尽量按 `style.layout_flexBasisPercent` 还原旧阅读 FlexBox 宽度，例如 `1` 为整行、`0.4` 为 40%、`0.25` 为 25%。桌面端当前忽略这个布局提示，仍按普通标签自然排列。

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
