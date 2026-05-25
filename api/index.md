# API 参考

Legado Tauri 书源引擎通过 `legado.*` 命名空间向脚本注入宿主 API。凡是涉及 I/O 的宿主能力（HTTP、哈希、加解密等）均返回 `Promise`，推荐统一使用 `async` / `await`。

## API 分类总览

### HTTP 请求 {#http}

| API                                                                          | 说明                               |
| ---------------------------------------------------------------------------- | ---------------------------------- |
| [`legado.http.get(url, headers?)`](/api/http-get)                            | 异步 GET，请 `await`               |
| [`legado.http.post(url, body, headers?)`](/api/http-post)                    | 异步 POST，请 `await`              |
| [`legado.http.postBinary(url, base64Body, headers?)`](/api/http-post-binary) | 异步二进制 POST                    |
| [`legado.http.batchGet(urls, headers?, concurrency?)`](/api/http-batch-get)  | 并发批量 GET                       |
| [`legado.http.request(options)`](/api/http-request)                          | 兼容层统一 HTTP 接口，返回响应文本 |
| [`fetch(input, init?)`](/api/http-fetch)                                     | 浏览器风格请求接口（全局注入）     |

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

| API                                                           | 说明                                    |
| ------------------------------------------------------------- | --------------------------------------- |
| `btoa(str)` / `atob(str)`                                     | Base64 编解码（标准 JS）                |
| `encodeURIComponent(str)` / `decodeURIComponent(str)`         | URL 编解码（标准 JS）                   |
| [`legado.urlEncodeCharset(str, charset)`](/api/encoding)      | 指定字符集 URL 编码（GBK 等）           |
| [`legado.htmlEncode(str)` / `htmlDecode(str)`](/api/encoding) | HTML 实体编解码                         |
| [`legado.md5(str)`](/api/hash)                                | 异步 MD5 哈希                           |
| [`legado.sha1(str)` / `sha256(str)`](/api/hash)               | 异步 SHA 哈希                           |
| [`legado.aesEncrypt(...)` / `aesDecrypt(...)`](/api/crypto)   | 异步 AES 加解密                         |
| [`legado.desEncrypt(...)` / `desDecrypt(...)`](/api/crypto)   | 异步 DES 加解密                         |
| [`legado.wasm.*`](/api/wasm)                                  | Wasm 扩展：数字 ABI 与 JSON ptr-len ABI |

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
