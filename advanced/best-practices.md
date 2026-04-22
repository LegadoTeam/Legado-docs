# 最佳实践

书源开发中常见的模式、技巧和注意事项。

## URL 处理

### 相对 URL 转绝对 URL

```js
var BASE = 'https://www.example.com';

function fullUrl(path) {
  if (!path) return '';
  if (path.indexOf('http') === 0) return path;
  if (path.indexOf('//') === 0) return 'https:' + path;
  if (path.indexOf('/') === 0) return BASE + path;
  return BASE + '/' + path;
}
```

### 封面 URL 兼容

部分站点封面使用相对路径、协议相对路径或 Base64 data URI：

```js
function fixCover(src) {
  if (!src) return '';
  if (src.indexOf('data:') === 0) return src;       // Base64 直接返回
  if (src.indexOf('//') === 0) return 'https:' + src; // 协议相对
  if (src.indexOf('http') !== 0) return BASE + src;    // 相对路径
  return src;
}
```

## 噪声过滤

### DOM 广告节点移除

```js
function cleanContent(html) {
  var doc = legado.dom.parse(html);
  // 移除常见广告容器
  var adSelectors = ['.ad', '.ads', '.adsbygoogle', '#ad', '[class*="sponsor"]'];
  for (var i = 0; i < adSelectors.length; i++) {
    legado.dom.remove(doc, adSelectors[i]);
  }
  return legado.dom.text(doc, '#content');
}
```

### 文本噪声正则过滤

```js
function cleanText(text) {
  return text
    .replace(/本章未完.*?点击下一页继续/g, '')
    .replace(/手机用户请浏览.*?阅读/g, '')
    .replace(/天才一秒记住.*?地址/g, '')
    .replace(/\s{3,}/g, '\n\n')  // 合并多余空行
    .trim();
}
```

## 编码处理

### GBK 站点

```js
async function search(keyword, page) {
  var encoded = legado.encoding.encode(keyword, 'gbk');
  var url = BASE + '/search.php?keyword=' + encoded;
  // 指定 GBK 编码获取
  var html = await legado.http.get(url, { 'Accept-Charset': 'gbk' });
  // ...
}
```

## 分页处理

### 搜索翻页

```js
async function search(keyword, page) {
  var url = BASE + '/search?q=' + encodeURIComponent(keyword) + '&page=' + page;
  var html = await legado.http.get(url);
  var doc = legado.dom.parse(html);
  var items = legado.dom.select(doc, '.book-item');

  if (items.length === 0) return []; // 空页 = 终止翻页

  return items.map(function(el) {
    return {
      name: legado.dom.text(el, '.title'),
      author: legado.dom.text(el, '.author'),
      bookUrl: fullUrl(legado.dom.attr(el, 'a', 'href')),
      coverUrl: fixCover(legado.dom.attr(el, 'img', 'src'))
    };
  });
}
```

### 章节列表分页

```js
async function chapterList(tocUrl) {
  var chapters = [];
  var html = await legado.http.get(tocUrl);
  var doc = legado.dom.parse(html);

  // 检测分页
  var pages = legado.dom.select(doc, '.page-select option');
  if (pages.length > 1) {
    var urls = pages.map(function(opt) {
      return fullUrl(legado.dom.attr(opt, null, 'value'));
    });
    var results = await legado.http.batchGet(urls);
    for (var i = 0; i < results.length; i++) {
      if (!results[i].ok) continue;
      chapters = chapters.concat(parseChapters(legado.dom.parse(results[i].data)));
    }
  } else {
    chapters = parseChapters(doc);
  }

  return chapters;
}
```

## 错误处理

### 网络请求重试

```js
function httpGetRetry(url, retries) {
  retries = retries || 2;
  for (var i = 0; i <= retries; i++) {
    try {
      return await legado.http.get(url);
    } catch (e) {
      if (i === retries) throw e;
      legado.log('[retry] 第 ' + (i + 1) + ' 次重试: ' + url);
    }
  }
}
```

### 优雅降级

```js
async function bookInfo(bookUrl) {
  var html = await legado.http.get(bookUrl);
  var doc = legado.dom.parse(html);

  return {
    name: legado.dom.text(doc, 'h1.title') || legado.dom.text(doc, 'h1') || '未知',
    author: legado.dom.text(doc, '.author') || legado.dom.text(doc, 'meta[name="author"]@content') || '',
    intro: legado.dom.text(doc, '.intro') || legado.dom.text(doc, '.description') || '',
    coverUrl: fixCover(
      legado.dom.attr(doc, '.cover img', 'src') ||
      legado.dom.attr(doc, 'meta[property="og:image"]', 'content')
    ),
    tocUrl: bookUrl
  };
}
```

## 日志规范

```js
// 推荐：带模块标记的日志
legado.log('[search] keyword=' + keyword + ' page=' + page);
legado.log('[bookInfo] url=' + bookUrl);
legado.log('[toc] 共 ' + chapters.length + ' 章');
legado.log('[content] 长度=' + text.length);

// 推荐：关键数据记录
legado.log('[search] 找到 ' + results.length + ' 个结果');
legado.log('[explore] 分类: ' + categories.join(', '));
```

## ES5 注意事项

Boa 引擎仅支持 ES5 语法，以下现代语法**不可用**：

```js
// ❌ 箭头函数
items.map(item => item.name);
// ✅ 普通函数
items.map(function(item) { return item.name; });

// ❌ const / let
const url = BASE + '/api';
// ✅ var
var url = BASE + '/api';

// ❌ 模板字符串
var msg = `Found ${count} items`;
// ✅ 字符串拼接
var msg = 'Found ' + count + ' items';

// ❌ 解构赋值
var { name, author } = book;
// ✅ 逐个赋值
var name = book.name;
var author = book.author;

// ❌ 展开运算符
var all = [...arr1, ...arr2];
// ✅ concat
var all = arr1.concat(arr2);

// ❌ for...of
for (var item of arr) {}
// ✅ for 循环
for (var i = 0; i < arr.length; i++) { var item = arr[i]; }
```

## 性能建议

- 优先使用 `legado.http.batchGet()` 批量请求，减少顺序等待
- 避免在循环中做不必要的 DOM 解析，解析一次后复用 doc 对象
- `processImage` 中及时调用 `legado.image.free()` 释放句柄
- 搜索空页时尽早返回空数组，避免无效处理
