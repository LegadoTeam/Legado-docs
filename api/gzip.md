# 文本压缩（gzip）

Tauri 引擎内置 gzip 压缩/解压能力，对应 Android 书源中的 `Packages.ZipUtil.gzip`。

> **Tauri 专属**：以下所有 API 仅在 Tauri/Boa 引擎中可用，HarmonyOS 端不支持。

## API 一览

| 函数                             | 说明                                              |
| -------------------------------- | ------------------------------------------------- |
| `legado.gzip(str)`               | 将 UTF-8 字符串 gzip 压缩，返回 base64 字符串     |
| `legado.gzipSync(str)`           | 同上，带 `Sync` 后缀的别名（两者完全等价）        |
| `legado.gunzip(base64)`          | 将 base64 编码的 gzip 数据解压，返回 UTF-8 字符串 |
| `legado.gunzipSync(base64)`      | 同上别名                                          |
| `legado.gzipBytes(base64)`       | 将 base64 编码的字节数组 gzip 压缩，返回 base64   |
| `legado.gzipBytesSync(base64)`   | 同上别名                                          |
| `legado.gunzipBytes(base64)`     | 将 base64 编码的 gzip 字节数组解压，返回 base64   |
| `legado.gunzipBytesSync(base64)` | 同上别名                                          |

> **关于 `Sync` 后缀**：在 Tauri/Boa 引擎中，`legado.gzip` 和 `legado.gzipSync` 行为完全相同，都是同步执行。
> `Sync` 后缀仅作为提示，表示"此函数在 HarmonyOS 等异步引擎上不存在对应版本"。

## 函数签名

```ts
// 字符串压缩/解压
legado.gzip(str: string): string        // UTF-8 字符串 → gzip 压缩 → base64
legado.gunzip(base64: string): string   // base64 → gzip 解压 → UTF-8 字符串

// 字节数组压缩/解压（输入输出均为 base64）
legado.gzipBytes(base64: string): string    // base64 字节 → gzip 压缩 → base64
legado.gunzipBytes(base64: string): string  // base64 → gzip 解压 → base64
```

失败时抛出异常（如解压损坏的 gzip 数据）。

## 使用场景

### 场景 1：提交 gzip 压缩的请求体

部分 API 要求以 gzip 压缩格式传递参数：

```js
const payload = JSON.stringify({ keyword: "斗破苍穹", page: 1 });
const compressed = legado.gzip(payload); // → base64 字符串

const resp = await legado.http.post(url, compressed, {
  "Content-Type": "application/octet-stream",
  "Content-Encoding": "gzip",
});
```

### 场景 2：解压服务端返回的 gzip 内容

某些接口返回 gzip 压缩的 base64 数据：

```js
const raw = await legado.http.get(url);
// raw 是 base64 编码的 gzip 数据
const text = legado.gunzip(raw);
const json = JSON.parse(text);
```

### 场景 3：字节级压缩（二进制协议）

用于处理二进制内容（如图片、协议包）：

```js
// 获取二进制内容（base64）
const binaryB64 = legado.http.getBinary(url);

// 压缩后再传输
const compressed = legado.gzipBytes(binaryB64);

// 解压
const original = legado.gunzipBytes(compressed);
```

### 场景 4：兼容 Android 书源 `Packages.ZipUtil.gzip`

compat 层会自动将旧书源的 `Packages.ZipUtil.gzip(text)` 代理为 `legado.gzip(text)`，无需修改书源代码。

```js
// 旧 Android 书源写法（compat 层自动处理）
var b = Packages.ZipUtil.gzip("hello");

// 等效的 Tauri 写法
var b = legado.gzip("hello");
```

## 注意事项

- `gzip` / `gunzip` 处理的是 **UTF-8 字符串**；如果数据不是有效 UTF-8，解压后会得到乱码或抛出异常。
- `gzipBytes` / `gunzipBytes` 处理的是 **任意字节数组**（以 base64 传递），不涉及字符集转换，适合二进制数据。
- 输出的 base64 使用标准 Base64 字母表（`+/=`），与 `btoa()` 兼容。
