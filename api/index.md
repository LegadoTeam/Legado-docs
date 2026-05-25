# API 参考

Legado Tauri 书源引擎通过 `legado.*` 命名空间向脚本注入宿主 API。凡是涉及 I/O 的宿主能力（HTTP、哈希、加解密等）均返回 `Promise`，推荐统一使用 `async` / `await`。

> **同步 API（Tauri/Boa 引擎专属）**：Boa 引擎内部 HTTP 和加密本质上都是同步阻塞执行的，额外暴露了不带 `await` 的 `*Sync` 变体。如果书源在 HarmonyOS/移动端运行，请继续使用 `await` 异步版本；Tauri 桌面端两种写法均支持。详见 [同步 API 说明](#sync)。

## API 分类总览

### HTTP 请求 {#http}

| API                                                                          | 说明                                                    |
| ---------------------------------------------------------------------------- | ------------------------------------------------------- |
| [`legado.http.get(url, headers?)`](/api/http-get)                            | 异步 GET，请 `await`                                    |
| [`legado.http.getSync(url, headers?)`](/api/http-get)                        | **同步 GET**，直接返回文本，无需 `await`（Tauri 专属）  |
| [`legado.http.post(url, body, headers?)`](/api/http-post)                    | 异步 POST，请 `await`                                   |
| [`legado.http.postSync(url, body, headers?)`](/api/http-post)                | **同步 POST**，直接返回文本，无需 `await`（Tauri 专属） |
| [`legado.http.request(options)`](/api/http-request)                          | 兼容层统一 HTTP 接口，返回响应文本                      |
| [`legado.http.requestSync(options)`](/api/http-request)                      | **同步** 兼容层 HTTP 接口（Tauri 专属）                 |
| [`legado.http.postBinary(url, base64Body, headers?)`](/api/http-post-binary) | 异步二进制 POST                                         |
| [`legado.http.batchGet(urls, headers?, concurrency?)`](/api/http-batch-get)  | 并发批量 GET                                            |
| [`legado.http.getBinarySync(url, headers?)`](#sync)                          | **同步**二进制 GET，返回 base64（Tauri 专属）           |
| [`legado.http.getBinary(url, headers?)`](#sync)                              | 同上，不带 Sync 后缀的别名                              |
| [`fetch(input, init?)`](/api/http-fetch)                                     | 浏览器风格请求接口（全局注入）                          |

### DOM 解析 {#dom}

| API                                                                  | 说明                                  |
| -------------------------------------------------------------------- | ------------------------------------- |
| [`legado.dom.parse(html)`](/api/dom-parse)                           | 解析 HTML → 文档句柄                  |
| [`legado.dom.select(handle, sel)`](/api/dom-select)                  | CSS 选择首个匹配                      |
| [`legado.dom.selectAll(handle, sel)`](/api/dom-select)               | CSS 选择全部匹配                      |
| [`legado.dom.text(handle)`](/api/dom-text)                           | 获取元素全部文本                      |
| [`legado.dom.html(handle)`](/api/dom-text)                           | 获取 innerHTML                        |
| [`legado.dom.attr(handle, name)`](/api/dom-text)                     | 获取属性值                            |
| [`legado.dom.selectText(handle, sel)`](/api/dom-shortcuts)           | 快捷：select + text                   |
| [`legado.dom.selectAttr(handle, sel, attr)`](/api/dom-shortcuts)     | 快捷：select + attr                   |
| [`legado.dom.selectAllTexts(handle, sel)`](/api/dom-shortcuts)       | 快捷：selectAll + text                |
| [`legado.dom.selectAllAttrs(handle, sel, attr)`](/api/dom-shortcuts) | 快捷：selectAll + attr                |
| [`legado.dom.selectByText(handle, text)`](/api/dom-utils)            | 按文本查找元素                        |
| [`legado.dom.remove(handle, sel)`](/api/dom-utils)                   | 移除匹配元素                          |
| [`legado.dom.free(handle)`](/api/dom-parse)                          | 释放文档句柄                          |
| [`legado.dom2.*`](/api/dom2)                                         | 对象风格 DOM 兼容层（Tauri 兼容入口） |

### 编码与加密 {#encoding}

| API                                                                        | 说明                                                            |
| -------------------------------------------------------------------------- | --------------------------------------------------------------- |
| `btoa(str)` / `atob(str)`                                                  | Base64 编解码（标准 JS）                                        |
| `encodeURIComponent(str)` / `decodeURIComponent(str)`                      | URL 编解码（标准 JS）                                           |
| [`legado.urlEncodeCharset(str, charset)`](/api/encoding)                   | 指定字符集 URL 编码（GBK 等）                                   |
| `legado.urlEncodeCharsetSync(str, charset)`                                | **同步**指定字符集 URL 编码（Tauri 专属）                       |
| [`legado.htmlEncode(str)` / `htmlDecode(str)`](/api/encoding)              | HTML 实体编解码                                                 |
| `legado.htmlEncodeSync(str)` / `legado.htmlDecodeSync(str)`                | **同步** HTML 实体编解码（Tauri 专属）                          |
| [`legado.md5(str)`](/api/hash)                                             | 异步 MD5 哈希                                                   |
| `legado.md5Sync(str)`                                                      | **同步** MD5 哈希（Tauri 专属）                                 |
| [`legado.sha1(str)` / `sha256(str)`](/api/hash)                            | 异步 SHA 哈希                                                   |
| `legado.sha1Sync(str)` / `legado.sha256Sync(str)`                          | **同步** SHA 哈希（Tauri 专属）                                 |
| `legado.hmacSha256Sync(data, key)`                                         | **同步** HMAC-SHA256（Tauri 专属）                              |
| [`legado.aesEncrypt(...)` / `aesDecrypt(...)`](/api/crypto)                | 异步 AES 加解密                                                 |
| `legado.aesEncryptSync(...)` / `legado.aesDecryptSync(...)`                | **同步** AES 加解密（Tauri 专属）                               |
| [`legado.desEncrypt(...)` / `desDecrypt(...)`](/api/crypto)                | 异步 DES 加解密                                                 |
| `legado.desEncryptSync(...)` / `legado.desDecryptSync(...)`                | **同步** DES 加解密（Tauri 专属）                               |
| `legado.gzipSync(str)` / `legado.gzip(str)`                                | **同步** gzip 压缩字符串 → base64（Tauri 专属）                 |
| `legado.gunzipSync(base64)` / `legado.gunzip(base64)`                      | **同步** gzip 解压 base64 → 字符串（Tauri 专属）                |
| `legado.gzipBytesSync(base64)` / `legado.gzipBytes(base64)`                | **同步** gzip 压缩字节 → base64（Tauri 专属）                   |
| `legado.gunzipBytesSync(base64)` / `legado.gunzipBytes(base64)`            | **同步** gzip 解压字节 → base64（Tauri 专属）                   |
| `legado.t2sSync(text)` / `legado.t2s(text)`                                | **同步** 繁体→简体（Tauri 专属）                                |
| `legado.s2tSync(text)` / `legado.s2t(text)`                                | **同步** 简体→繁体（Tauri 专属）                                |
| `legado.queryTTFSync(base64FontData)` / `legado.queryTTF(...)`             | **同步** 字体反爬映射（路径哈希法），返回 JSON（Tauri 专属）    |
| `legado.queryTTFByNameSync(base64FontData)` / `legado.queryTTFByName(...)` | **同步** 字体反爬映射（glyph-name 法），返回 JSON（Tauri 专属） |
| [`legado.wasm.*`](/api/wasm)                                               | Wasm 扩展：数字 ABI 与 JSON ptr-len ABI                         |

### 同步 API 说明 {#sync}

Boa 引擎中所有 HTTP 请求和加密操作本质上都是**同步阻塞**执行的（HTTP 使用 reqwest blocking，加密是纯 CPU 计算）。`await` 风格是为了与 HarmonyOS 端保持接口一致而引入的 Promise 包装层。

**同步写法示例（仅 Tauri/Boa 可用）：**

```js
// 无需 async function，直接调用
const html = legado.http.getSync("https://example.com");
const hash = legado.md5Sync("hello world");
const cipher = legado.aesEncryptSync(data, key, iv);
```

**跨平台兼容写法（推荐）：**

```js
// 在 async 函数中使用 await，Tauri 和 HarmonyOS 均支持
async function getChapter(url) {
  const html = await legado.http.get(url);
  return html;
}
```

> **注意**：`*Sync` 系列函数在 HarmonyOS / 移动端**不可用**，仅适用于 Tauri 桌面客户端。
> 新书源建议使用 `await` 异步风格以保持跨平台兼容性；
> 老书源或需要在非 `async` 函数顶层直接调用时，可使用 Sync 变体。

### 浏览器探测 {#browser}

| API                                                                             | 说明                                                |
| ------------------------------------------------------------------------------- | --------------------------------------------------- |
| [`legado.browser.acquire(role, options?)`](/api/browser-session)                | **推荐**：按角色获取/复用会话，引擎自动管理生命周期 |
| [`legado.browser.create(options?)`](/api/browser-session)                       | 创建探测会话（底层，非必要不使用）                  |
| [`legado.browser.navigate(id, url, options?)`](/api/browser-navigate)           | 导航到 URL                                          |
| [`legado.browser.eval(id, code, options?)`](/api/browser-navigate)              | 执行页面 JS                                         |
| [`legado.browser.run(url, code, options?)`](/api/browser-navigate)              | 一次性导航 + 执行                                   |
| [`legado.browser.html(id)` / `text(id)` / `url(id)`](/api/browser-page)         | 读取页面内容                                        |
| [`legado.browser.cookies(url?)` / `getCookie(domain, name)`](/api/browser-page) | 读取 Cookie                                         |
| [`legado.browser.postMessage/request/waitMessage`](/api/browser-bridge)         | Boa 与探测页面双向通信                              |
| [`legado.browser2.acquire(role, options?)`](/api/browser-navigate)              | 对象风格 `acquire`，返回 `BrowserSession`           |

### 图片处理 {#image}

| API                                                                      | 说明                |
| ------------------------------------------------------------------------ | ------------------- |
| [`legado.image.decode(base64)`](/api/image)                              | 解码图片 → 句柄     |
| [`legado.image.create(w, h)`](/api/image)                                | 创建空白图片        |
| [`legado.image.width(handle)`](/api/image)                               | 获取宽度            |
| [`legado.image.height(handle)`](/api/image)                              | 获取高度            |
| [`legado.image.crop(handle, x, y, w, h)`](/api/image)                    | 裁剪                |
| [`legado.image.paste(dest, src, x, y)`](/api/image)                      | 粘贴                |
| [`legado.image.copyRegion(src, dest, sx, sy, w, h, dx, dy)`](/api/image) | 区域复制            |
| [`legado.image.encode(handle, format?)`](/api/image)                     | 编码为 base64       |
| [`legado.image.free(handle)`](/api/image)                                | 释放句柄            |
| [`legado.image.qrCode(text, size?)`](/api/image)                         | 生成二维码 → 句柄   |
| [`legado.image.qrCodeDataUrl(text, size?)`](/api/image)                  | 生成二维码 data URL |
| [`legado.image.jmDecode(srcHandle, num)`](/api/image)                    | 禁漫条带还原        |

### 设备标识 {#device-id}

| API                                                 | 说明                                                                                        |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| [`legado.runtime.getMachineUid()`](/api/device-id)  | **返回 `Promise<string>`**：优先获取系统硬件 UID（重装软件不变），不可用时自动回落到软 UUID |
| [`legado.runtime.getMachineUUID()`](/api/device-id) | **返回 `Promise<string>`**：始终返回应用本地软 UUID（卸载/清数据后重置）                    |

> **硬件 UID**：与操作系统/硬件绑定，重装软件后不变。
> **软 UUID**：存于应用数据目录（`app_state.redb`），卸载清除数据后重置。

### 文本压缩 {#gzip}

Tauri 引擎暴露了 gzip 压缩/解压能力，用于书源处理压缩传输或 `Packages.ZipUtil.gzip` 兼容场景。

| API                              | 说明                                       |
| -------------------------------- | ------------------------------------------ |
| `legado.gzip(str)`               | 将 UTF-8 字符串 gzip 压缩，返回 base64     |
| `legado.gzipSync(str)`           | 同上，带 Sync 后缀的别名                   |
| `legado.gunzip(base64)`          | 将 base64 gzip 数据解压，返回 UTF-8 字符串 |
| `legado.gunzipSync(base64)`      | 同上，带 Sync 后缀的别名                   |
| `legado.gzipBytes(base64)`       | 将 base64 字节 gzip 压缩，返回 base64      |
| `legado.gzipBytesSync(base64)`   | 同上，带 Sync 后缀的别名                   |
| `legado.gunzipBytes(base64)`     | 将 base64 gzip 字节解压，返回 base64       |
| `legado.gunzipBytesSync(base64)` | 同上，带 Sync 后缀的别名                   |

```js
// 压缩字符串
const compressed = legado.gzipSync("Hello, World!");
// 解压还原
const text = legado.gunzipSync(compressed);
```

### 繁简转换 {#t2s}

基于 [zhconv](https://crates.io/crates/zhconv)（MediaWiki 规则集）提供繁简互转。

| API                    | 说明        |
| ---------------------- | ----------- |
| `legado.t2s(text)`     | 繁体 → 简体 |
| `legado.t2sSync(text)` | 同上别名    |
| `legado.s2t(text)`     | 简体 → 繁体 |
| `legado.s2tSync(text)` | 同上别名    |

```js
const simp = legado.t2sSync("繁體中文"); // → "繁体中文"
const trad = legado.s2tSync("繁体中文"); // → "繁體中文"
```

### 字体反爬 {#queryttf}

部分站点使用自定义 TTF 字体混淆字符。Tauri 引擎提供**两种还原策略**，对应不同强度的混淆：

| 混淆强度   | 特征                                              | 推荐函数         |
| ---------- | ------------------------------------------------- | ---------------- |
| **低强度** | glyph 名为 `uni6211` 格式，直接暴露真实 Unicode   | `queryTTFByName` |
| **高强度** | glyph 名混淆（如 `glyph001`），需对比字形轮廓路径 | `queryTTF`       |

| API                                         | 说明                                                                                              |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `legado.queryTTFByName(base64FontData)`     | glyph-name 法：解析 `uniXXXX` glyph 名称 → 真实 Unicode（低强度混淆，等效 Python fontTools 方案） |
| `legado.queryTTFByNameSync(base64FontData)` | 同上别名                                                                                          |
| `legado.queryTTF(base64FontData)`           | 路径哈希法：对比字形轮廓推断映射（高强度混淆）                                                    |
| `legado.queryTTFSync(base64FontData)`       | 同上别名                                                                                          |
| `legado.http.getBinary(url, headers?)`      | 同步下载二进制文件，返回 base64（可用于下载字体）                                                 |
| `legado.http.getBinarySync(url, headers?)`  | 同上别名                                                                                          |

**返回格式**：`{ "假字符": "真字符", ... }` 的 JSON 字符串。

```js
// 低强度混淆（glyph 名含 uniXXXX）— 优先尝试
const fontB64 = legado.http.getBinary("https://example.com/font.ttf");
let mapJson = legado.queryTTFByName(fontB64);
let map = JSON.parse(mapJson);

// 如果 queryTTFByName 返回空映射，退回路径哈希法（高强度混淆）
if (Object.keys(map).length === 0) {
  mapJson = legado.queryTTF(fontB64);
  map = JSON.parse(mapJson);
}

const fix = (text) => text.replace(/[\u4e00-\uffff]/g, (c) => map[c] || c);
```

> **compat 层自动支持**：老 Android 书源调用 `java.queryTTF(url)` / `java.queryBase64TTF(b64)` /
> `java.replaceFont(html)` 时，compat 层会自动代理到上述 API，无需修改书源代码。

### 其他 {#misc}

| API                                                          | 说明                         |
| ------------------------------------------------------------ | ---------------------------- |
| [`legado.log(msg)`](/api/log)                                | 打印日志                     |
| [`legado.toast(msg)`](/api/log)                              | 显示通知                     |
| [`legado.sleep(ms)`](/api/log)                               | 同步阻塞延迟（不需要 await） |
| [`legado.config.read(scope, key)`](/api/config)              | 读取配置                     |
| [`legado.config.write(scope, key, value)`](/api/config)      | 写入配置                     |
| [`legado.config.readBytes(scope, key)`](/api/config)         | 读取字节数组配置             |
| [`legado.config.writeBytes(scope, key, bytes)`](/api/config) | 写入字节数组配置             |
| [`legado.ui.emit(event, data)`](/api/ui-emit)                | 推送 UI 事件                 |

### 运行时信息 {#runtime}

| API                                                                    | 说明                                      |
| ---------------------------------------------------------------------- | ----------------------------------------- |
| [`legado.runtime.platform`](/api/device-id#legado-runtime-运行时信息)  | 运行平台（`"tauri"`）                     |
| [`legado.runtime.engine`](/api/device-id#legado-runtime-运行时信息)    | JS 引擎名称（`"boa"`）                    |
| [`legado.runtime.os`](/api/device-id#legado-runtime-运行时信息)        | 操作系统（`"windows"` / `"android"` / …） |
| [`legado.runtime.has(name)`](/api/device-id#legado-runtime-运行时信息) | 检测某项能力是否可用                      |
| [`legado.runtime.getMachineUid()`](/api/device-id)                     | 获取硬件 UID（重装不变）                  |
| [`legado.runtime.getMachineUUID()`](/api/device-id)                    | 获取软 UUID（清数据后重置）               |

### 数据结构 {#types}

| 类型                                                  | 说明                                            |
| ----------------------------------------------------- | ----------------------------------------------- |
| [`BookItem`](/api/types-book-item)                    | 搜索、发现和书籍详情返回结构                    |
| [`ChapterInfo`](/api/types-chapter)                   | `chapterList()` 返回的章节结构，支持 `vip` 标记 |
| [`PurchaseChapterResult`](/api/types-purchase-result) | `purchaseChapter()` 推荐返回结构                |
