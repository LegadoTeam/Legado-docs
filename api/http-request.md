# legado.http.request

统一 HTTP 请求接口，支持兼容旧书源的 `get/post/request` 写法。   >不在建议使用建议改为使用全局函数fetch

::: info CLI 兼容性
CLI 测试模式会启动隐藏的 Tauri 后端，`legado.http.request` 使用与 GUI 一致的宿主实现。
:::

## 签名

```js
legado.http.request(options) → Promise<string>
```

### options 参数

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `url` | `string` | ✅ | 请求 URL |
| `method` | `string` | 否 | HTTP 方法，默认 `'GET'` |
| `body` | `string` | 否 | 请求体 |
| `headers` | `object` | 否 | 自定义请求头 |
| `timeoutSecs` | `number` | 否 | 单次请求超时秒数，默认 `30` |

**返回值**：`Promise<string>`。该接口会优先转发到兼容层的 `get/post` 语义。

## 浏览器风格 API

书源加载前会自动注入浏览器风格兼容层，支持：

- `fetch(input, init?)`
- `Headers`
- `Request`
- `Response`
- `URLSearchParams`
- `FormData`

这些对象会作为**全局对象**直接注入，适合从已有网页脚本迁移请求逻辑；同时也能通过 `legado.http.fetch`、`legado.http.Headers`、`legado.http.Request`、`legado.http.Response`、`legado.http.URLSearchParams`、`legado.http.FormData` 访问。详见 [fetch API](/api/http-fetch)。

## 示例

```js
var resp = await legado.http.request({
  url: 'https://api.example.com/data',
  method: 'POST',
  body: JSON.stringify({ key: 'value' }),
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer token123'
  }
});
var data = JSON.parse(resp);
```

```js
var resp = await fetch('https://api.example.com/data', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ key: 'value' })
});
var data = await resp.json();
```
