# legado.http.batchGet

并发批量 GET 请求，一次发出多个请求并收集结果。适用于多页目录并发加载。

## 签名

```js
legado.http.batchGet(urls, headers?, concurrency?) → Promise<BatchResult[]>
```

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `urls` | `string[]` | ✅ | URL 数组 |
| `headers` | `object` | 否 | 共享的请求头 |
| `concurrency` | `number` | 否 | 并发数限制 |

### 返回值

`Promise<BatchResult[]>`，resolve 后每个元素：

| 字段 | 类型 | 说明 |
|------|------|------|
| `url` | `string` | 请求的 URL |
| `ok` | `boolean` | 是否成功 |
| `data` | `string` | 成功时的响应体 |
| `error` | `string` | 失败时的错误信息 |

## 示例

### 多页目录并发加载

```js
async function chapterList(tocUrl) {
  var html = await legado.http.get(tocUrl);
  var doc = legado.dom.parse(html);

  // 提取所有分页 URL
  var pageUrls = legado.dom.selectAllAttrs(doc, 'select.page option', 'value');
  legado.dom.free(doc);

  // 并发请求
  var results = await legado.http.batchGet(pageUrls);
  var chapters = [];
  for (var i = 0; i < results.length; i++) {
    if (results[i].ok) {
      var pageDoc = legado.dom.parse(results[i].data);
      var names = legado.dom.selectAllTexts(pageDoc, '.chapter a');
      var urls = legado.dom.selectAllAttrs(pageDoc, '.chapter a', 'href');
      for (var j = 0; j < names.length; j++) {
        chapters.push({ name: names[j], url: urls[j] });
      }
      legado.dom.free(pageDoc);
    }
  }
  return chapters;
}
```
