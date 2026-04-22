# 内置单元测试

书源支持内置 `TEST()` 函数，用于开发阶段验证各项功能。CLI 和 GUI 调试面板均可执行测试。

## TEST 函数

```js
async function TEST() {
  // 测试搜索
  var results = await search('斗破苍穹', 1);
  assert(results.length > 0, '搜索应返回结果');
  assert(results[0].name, '结果应有 name 字段');
  assert(results[0].bookUrl, '结果应有 bookUrl 字段');
  legado.log('[TEST] 搜索通过，返回 ' + results.length + ' 条');

  // 测试书籍信息
  var info = await bookInfo(results[0].bookUrl);
  assert(info.name, 'bookInfo 应返回 name');
  assert(info.tocUrl, 'bookInfo 应返回 tocUrl');
  legado.log('[TEST] 书籍信息通过');

  // 测试章节列表
  var chapters = await chapterList(info.tocUrl);
  assert(chapters.length > 0, '应有章节');
  assert(chapters[0].name, '章节应有 name');
  assert(chapters[0].url, '章节应有 url');
  legado.log('[TEST] 章节列表通过，共 ' + chapters.length + ' 章');

  // 测试正文
  var text = await chapterContent(chapters[0].url);
  assert(text && text.length > 100, '正文应有足够内容');
  legado.log('[TEST] 正文获取通过，长度 ' + text.length);
}
```

## assert 辅助函数

书源中自行定义：

```js
function assert(condition, message) {
  if (!condition) {
    throw new Error('断言失败: ' + (message || '未知'));
  }
}
```

## CLI 执行

执行完整流程测试：

```bash
cargo run -- booksource-test ./booksources/我的书源.js all 斗破苍穹
```

CLI 会依次调用 search → bookInfo → chapterList → chapterContent → explore，输出每项测试结果。

## 测试设计建议

### 最小化依赖

```js
async function TEST() {
  // 先测试基础网络是否通
  var html = await legado.http.get(BASE);
  assert(html.length > 0, '首页应可访问');

  // 再测试具体功能
  var results = await search('测试', 1);
  // ...
}
```

### 分步验证

```js
async function TEST() {
  legado.log('=== 开始测试 ===');

  legado.log('[1/4] 测试搜索...');
  var results = await search('玄幻', 1);
  assert(results.length > 0, '搜索无结果');

  legado.log('[2/4] 测试书籍信息...');
  var info = await bookInfo(results[0].bookUrl);
  assert(info.tocUrl, '缺少 tocUrl');

  legado.log('[3/4] 测试章节列表...');
  var chapters = await chapterList(info.tocUrl);
  assert(chapters.length > 0, '无章节');

  legado.log('[4/4] 测试正文...');
  var text = await chapterContent(chapters[0].url);
  assert(text.length > 50, '正文过短');

  legado.log('=== 全部通过 ===');
}
```

### 发现页测试

```js
async function TEST() {
  // 测试分类列表
  var cats = await explore(1, 'GETALL');
  assert(Array.isArray(cats), 'GETALL 应返回数组');
  assert(cats.length > 0, '应有分类');
  legado.log('[TEST] 分类: ' + cats.join(', '));

  // 测试第一个分类
  var books = await explore(1, cats[0]);
  assert(books.length > 0, '分类应有书籍');
  assert(books[0].name, '书籍应有 name');
}
```

## 常见断言模式

```js
// 数组非空
assert(Array.isArray(arr) && arr.length > 0, '数组不应为空');

// 字符串非空
assert(str && str.trim().length > 0, '字符串不应为空');

// URL 格式
assert(url && (url.indexOf('http://') === 0 || url.indexOf('https://') === 0), '应为有效 URL');

// 数值范围
assert(count > 0 && count < 10000, '数量应在合理范围');
```
