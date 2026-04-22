# legado.http.get

异步 HTTP GET 请求，返回响应体字符串。   >不在建议使用建议改为使用全局函数fetch

## 签名

```js
legado.http.get(url, headers?) → Promise<string>
```

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `url` | `string` | ✅ | 请求 URL |
| `headers` | `object` | 否 | 自定义请求头 `{ key: value }` |

**返回值**：`Promise<string>`。网络异常时 Promise reject。

## 示例

以下示例默认位于 `async function` 内。

### 基本用法

```js
var html = await legado.http.get('https://www.example.com/page');
```

### 解析 JSON 响应

```js
var resp = await legado.http.get('https://api.example.com/books');
var data = JSON.parse(resp);
legado.log('共 ' + data.total + ' 本书');
```

### 带查询参数

```js
var url = BASE + '/search?q=' + encodeURIComponent(keyword) + '&page=' + page;
var result = await legado.http.get(url);
```

### 自定义请求头

```js
var html = await legado.http.get(url, {
  'Referer': 'https://example.com',
  'User-Agent': 'Custom/1.0',
  'X-Token': 'my-secret-token'
});
```

### 错误处理

```js
async function safeGet(url) {
  try {
    return await legado.http.get(url);
  } catch (e) {
    legado.log('请求失败: ' + e.message);
    return null;
  }
}
```

::: info 默认行为
- 所有请求默认携带 Chrome UA（`Mozilla/5.0 ... Chrome/120.0.0.0`）
- 可通过 `headers` 参数覆盖 `User-Agent`
- HTTP API 已异步化，请使用 `await`
:::
