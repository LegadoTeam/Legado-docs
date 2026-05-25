# legado.http.getBinary

同步下载二进制文件，返回 base64 编码的字节字符串。常用于下载字体文件、图片、压缩包等二进制资源。

> **Tauri 专属**：此 API 仅在 Tauri/Boa 引擎中可用，HarmonyOS 端不支持。

## 签名

```ts
legado.http.getBinary(url: string, headers?: object): string
legado.http.getBinarySync(url: string, headers?: object): string
// 两者完全等价，Sync 后缀仅表示无 HarmonyOS 异步版本
```

| 参数      | 类型     | 必填 | 说明                          |
| --------- | -------- | ---- | ----------------------------- |
| `url`     | `string` | ✅   | 请求 URL                      |
| `headers` | `object` | 否   | 自定义请求头 `{ key: value }` |

**返回值**：base64 编码的响应体字节字符串（标准 Base64，`+/=`）。

网络异常或 HTTP 非 2xx 时抛出异常。

## 示例

### 下载字体文件用于反爬解析

```js
const fontB64 = legado.http.getBinary("https://example.com/static/font.ttf");
const map = JSON.parse(legado.queryTTFByName(fontB64));
const decoded = text.replace(/./g, (c) => map[c] || c);
```

### 下载图片并转为 data URL

```js
const imgB64 = legado.http.getBinary("https://example.com/cover.jpg");
const dataUrl = "data:image/jpeg;base64," + imgB64;
```

### 带自定义请求头

```js
const fontB64 = legado.http.getBinary(fontUrl, {
  Referer: "https://example.com",
  Origin: "https://example.com",
});
```

## 与 fetch 对比

如果需要跨平台兼容，可以用 `fetch` + `arrayBuffer` 代替：

```js
// 跨平台写法（Tauri 和 HarmonyOS 均可用）
const resp = await fetch(fontUrl);
const buf = await resp.arrayBuffer();
const fontB64 = btoa(String.fromCharCode(...new Uint8Array(buf)));
```

`getBinary` 的优势是**无需 async**，可在非 `async` 函数的顶层直接调用。
