# legado.http.post

异步 HTTP POST 请求。   >不在建议使用建议改为使用全局函数fetch

## 签名

```js
legado.http.post(url, body, headers?) → Promise<string>
```

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `url` | `string` | ✅ | 请求 URL |
| `body` | `string` | ✅ | 请求体字符串 |
| `headers` | `object` | 否 | 自定义请求头 |

**返回值**：`Promise<string>`。

## 示例

以下示例默认位于 `async function` 内。

### 表单提交

```js
var resp = await legado.http.post(
  'https://www.example.com/login',
  'username=myuser&password=mypass'
);
var result = JSON.parse(resp);
```

默认 `Content-Type` 为 `application/x-www-form-urlencoded`。

### JSON 请求体

```js
var body = JSON.stringify({ keyword: '三体', page: 1 });
var resp = await legado.http.post('https://api.example.com/search', body, {
  'Content-Type': 'application/json'
});
var data = JSON.parse(resp);
```

### 登录并持久化 Token

```js
async function login(user, pass) {
  var resp = await legado.http.post(
    BASE + '/api/login',
    'user=' + encodeURIComponent(user) + '&pass=' + encodeURIComponent(pass)
  );
  var json = JSON.parse(resp);
  if (json.code === 0) {
    legado.config.write('my_source.js', 'token', json.data.token);
    return json.data.token;
  }
  throw new Error('登录失败: ' + json.message);
}
```
