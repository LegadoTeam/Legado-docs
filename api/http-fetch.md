# fetch / Headers / Request / Response / URLSearchParams / FormData

书源加载前会自动注入浏览器风格 HTTP 兼容层，适合迁移已有网页脚本中的请求逻辑。

## 注入方式

以下对象会作为**全局对象**注入到书源运行时中，因此可以直接使用：

```js
var headers = new Headers({ 'Accept': 'application/json' });
var req = new Request(url, { headers: headers });
var resp = await fetch(req);
```

```js
var params = new URLSearchParams({ keyword: '三体', page: 1 });
var form = new FormData();
form.append('username', 'demo');
form.append('password', 'secret');
```

兼容层同时也会挂到 `legado.http` 下，下面两种写法都可用：

```js
var resp1 = await fetch(url);
var resp2 = await legado.http.fetch(url);
```

## 可用对象

- `fetch(input, init?)`
- `Headers`
- `Request`
- `Response`
- `URLSearchParams`
- `FormData`

## 支持范围

- 支持 `method` / `headers` / `body` / `credentials` / `timeoutSecs`
- `Response` 支持 `text()` / `json()` / `clone()`
- `Request` 支持 `clone()` / `text()` / `json()`
- `URLSearchParams` 支持 `append()` / `set()` / `get()` / `getAll()` / `delete()` / `has()` / `toString()`
- `FormData` 支持 `append()` / `set()` / `get()` / `getAll()` / `delete()` / `has()`
- `credentials: 'omit'` 会关闭宿主自动 Cookie 注入
- 这是兼容层，不是完整浏览器实现；`window` / `document` / `XMLHttpRequest` 仍不可用
- `Headers` / `Request` / `Response` / `URLSearchParams` / `FormData` 既可直接使用，也可通过 `legado.http.*` 同名对象访问
- `FormData` 当前仅支持文本字段，不支持 `File` / `Blob`

## 示例

```js
async function search(keyword, page) {
  var params = new URLSearchParams({
    keyword: keyword,
    page: page
  });
  var resp = await fetch('https://api.example.com/search?' + params.toString(), {
    headers: {
      'Accept': 'application/json'
    }
  });
  var data = await resp.json();
  return data.list;
}
```

```js
async function login(user, pass) {
  var form = new FormData();
  form.append('username', user);
  form.append('password', pass);

  var resp = await fetch('https://api.example.com/login', {
    method: 'POST',
    body: form
  });
  if (!resp.ok) {
    throw new Error('登录失败: ' + resp.status + ' ' + resp.statusText);
  }
  return await resp.json();
}
```
