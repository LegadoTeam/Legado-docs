# legado.http.postBinary

发送异步二进制 POST 请求。`body` 为 base64 编码的字符串，`Content-Type` 自动设为 `application/octet-stream`。   >不在建议使用建议改为使用全局函数fetch

## 签名

```js
legado.http.postBinary(url, base64Body, headers?) → Promise<string>
```

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `url` | `string` | ✅ | 请求 URL |
| `base64Body` | `string` | ✅ | base64 编码的请求体 |
| `headers` | `object` | 否 | 自定义请求头 |

**返回值**：`Promise<string>`。

## 示例

```js
// 将字符串编码为 base64 后发送
var data = btoa('raw binary data here');
var resp = await legado.http.postBinary('https://api.example.com/upload', data);
```
