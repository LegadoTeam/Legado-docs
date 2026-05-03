# 鸿蒙兼容性与异步语义

本章专门说明 HarmonyOS 版本当前的书源运行时状态，重点解释哪些宿主 API 已经切到异步，哪些还没有完全对齐 Tauri/Rust 端。

> 本章基于当前仓库代码扫描结果整理，主要对应：
>
> - `LegadoArkTS/entry/src/main/resources/rawfile/engine_runtime.js`
> - `LegadoArkTS/entry/src/main/ets/bridge/EngineNativeBridge.ets`
> - `LegadoArkTS/entry/src/main/ets/native/HttpClient.ets`
> - `LegadoArkTS/entry/src/main/ets/native/Crypto.ets`
> - `LegadoArkTS/entry/src/main/ets/engine/BookSourceEngine.ets`

## 当前结论

鸿蒙端已经不是“全同步书源运行时”了。

目前可以确认：

- `legado.http.get / post / request` 走原生桥接，返回 `Promise`
- `legado.md5 / sha1 / sha256 / hmacSha256` 已改为异步 `Promise`
- `legado.aesEncrypt / aesDecrypt` 已改为异步 `Promise`
- 书源入口函数 `search / bookInfo / chapterList / chapterContent / explore / init` 可以返回同步值，也可以返回 Promise；运行时会统一等待结果

但同时也要明确，鸿蒙端**还没有完全补齐**所有宿主 API。当前仍有一批函数没有对齐，不能简单认为“文档里所有 API 在鸿蒙都已经可用”。

## 推荐写法

书源脚本现在应统一按 `async function + await` 编写：

```js
async function search(keyword, page) {
  var html = await legado.http.get(BASE + '/search?q=' + encodeURIComponent(keyword));
  var sign = await legado.md5(html);
  var doc = legado.dom.parse(html);
  var list = legado.dom.selectAll(doc, '.book-item');
  legado.dom.free(doc);
  legado.log('sign=' + sign + ', count=' + list.length);
  return [];
}
```

这也是当前最稳妥的跨平台写法。不要再按旧写法把 `legado.http.*` 或 `legado.md5()` 当成立即返回字符串的同步函数。

## 已确认可用的异步宿主 API

当前鸿蒙端已经切到异步的能力如下：

| API | 当前状态 | 说明 |
| --- | --- | --- |
| `legado.http.get(url, headers?)` | 已异步 | 通过 `NATIVE.httpRequest` 桥接到 ArkTS `HttpClient` |
| `legado.http.post(url, body, headers?)` | 已异步 | 与 `get` 同路径 |
| `legado.http.request(...)` | 已异步，但有签名差异 | 见下文“已知差异” |
| `legado.md5(str)` | 已异步 | 通过 `asyncCrypto` 调到 `Crypto.md5Async` |
| `legado.sha1(str)` | 已异步 | 同上 |
| `legado.sha256(str)` | 已异步 | 同上 |
| `legado.hmacSha256(data, key)` | 已异步 | 同上 |
| `legado.aesEncrypt(data, key, iv?, mode?)` | 已异步 | 通过 `asyncAes` |
| `legado.aesDecrypt(data, key, iv?, mode?)` | 已异步 | 通过 `asyncAes` |
| `legado.aesDecryptB64Iv(cipher, key, ivB64, mode?)` | 已异步 | 通过 `asyncAesB64Iv` |
| `legado.desEncrypt(data, key, iv?)` | 已异步 | 通过 `asyncDes` |
| `legado.desDecrypt(data, key, iv?)` | 已异步 | 通过 `asyncDes` |
| `legado.htmlEncode(str)` | 已异步 | 返回 `Promise.resolve()`，可 `await` |
| `legado.htmlDecode(str)` | 已异步 | 返回 `Promise.resolve()`，可 `await` |
| `legado.urlEncodeCharset(str, charset)` | 已异步 | 返回 `Promise.resolve()`，可 `await` |

## 仍然保持同步语义的本地能力

这类能力主要是纯内存计算或轻量桥接，当前仍按同步方式使用：

| API 类别 | 当前状态 |
| --- | --- |
| `legado.dom.*` | 同步 |
| `legado.base64Encode / base64Decode` | 同步 |
| `legado.urlEncode / urlDecode` | 同步 |
| `legado.base64ByteSlice` | 同步 |
| `legado.config.read / write / readBytes / writeBytes` | 同步 |
| `legado.log / toast / ui.emit` | 同步 |

## 当前尚未补齐或未完全对齐的 API

下面这些能力在鸿蒙端当前代码里还没有完整实现，写书源时应避免依赖：

| API | 当前情况 |
| --- | --- |
| `legado.http.postBinary` | 未实现 |
| `legado.http.batchGet` | 未实现 |
| `legado.http.cookies / setCookie` | 未实现 |
| `legado.image.*` | 未实现 |

如果你的书源依赖以上能力，当前不能认为鸿蒙端已经兼容。

## 浏览器探测相关说明

鸿蒙端当前的 `legado.browser.*` 不是 Tauri 端那种完整的浏览器探测实现，而是一个**轻量占位版**：

- `create / acquire / close` 只是维护内存里的 session
- `navigate` 本质上仍是走 HTTP 抓取 HTML
- `eval` 是在抓回来的 HTML 上做轻量 DOM 运行，不是真实页面 JS 环境
- `cookies()` 当前返回空数组
- `setCookie()`、`setUserAgent()`、`show()`、`hide()` 当前只是占位返回

所以：

- 依赖真实登录态、真实浏览器执行环境、真实 WebView Cookie 的书源，当前不能把鸿蒙端 `legado.browser.*` 当成 Tauri 同等级能力
- 这部分更适合视为“过渡兼容接口”，不是完整浏览器探测能力

## 已知差异

### 1. `legado.http.request` 签名仍有兼容性风险

公开文档通常写成：

```js
await legado.http.request({
  url: 'https://example.com/api',
  method: 'POST',
  body: 'a=1'
});
```

但当前鸿蒙运行时里的实现仍是：

```js
legado.http.request(url, opt)
```

这意味着如果你直接按 `request(options)` 写，鸿蒙端存在解析错误风险。当前跨平台最稳妥的建议是：

- 优先使用 `legado.http.get()` / `legado.http.post()`
- 非必要先不要依赖 `legado.http.request(options)` 这种更宽泛的签名

### 2. 文档中仍有少量旧描述

仓库里仍能看到一些历史描述，把部分 API 写成“同步返回字符串”。这已经不再适用于当前鸿蒙异步语义。

判断优先级建议如下：

1. 以当前运行时代码为准
2. 以本章的鸿蒙说明为准
3. 其他未更新页面如果与本章冲突，按“异步宿主 API 必须 `await`”处理

## 书源开发建议

为了同时兼容 Tauri 与鸿蒙，当前建议遵守以下约束：

- 所有网络请求都写成 `await legado.http.get/post(...)`
- 所有哈希和对称加密调用都写成 `await legado.md5(...)`、`await legado.aesDecrypt(...)`、`await legado.desDecrypt(...)`
- HTML 实体处理和字符集 URL 编码统一写成 `await legado.htmlDecode(...)`、`await legado.urlEncodeCharset(...)`
- 不要在新书源里继续使用同步网络请求风格
- 非必要先不要依赖 `postBinary`、`batchGet`、`image`、`http.cookies`
- 依赖真实浏览器探测的网站，暂时不要把鸿蒙端当成完全兼容平台

## 建议模板

下面这个模板是当前最适合跨平台的基础写法：

```js
async function search(keyword, page) {
  var url = BASE + '/search?q=' + encodeURIComponent(keyword) + '&page=' + page;
  var html = await legado.http.get(url);
  var doc = legado.dom.parse(html);
  var items = legado.dom.selectAll(doc, '.book-item');
  var books = [];

  for (var i = 0; i < items.length; i++) {
    books.push({
      name: legado.dom.selectText(items[i], '.title'),
      author: legado.dom.selectText(items[i], '.author'),
      bookUrl: legado.dom.selectAttr(items[i], 'a', 'href'),
      latestChapter: legado.dom.selectText(items[i], '.latest a'),
      wordCount: legado.dom.selectText(items[i], '.words'),
      updateTime: legado.dom.selectText(items[i], '.updated'),
      status: legado.dom.selectText(items[i], '.status'),
    });
  }

  legado.dom.free(doc);
  return books;
}
```

## 后续补齐方向

如果后续要继续完善鸿蒙端书源运行时，优先级建议如下：

1. 补齐 `legado.http.postBinary` 与 `legado.http.batchGet`
2. 补齐 `aesDecryptB64Iv`、`desEncrypt`、`desDecrypt`
3. 统一 `legado.http.request(options)` 签名
4. 明确 `http.cookies / setCookie` 的兼容方案
5. 评估 `legado.image.*` 与浏览器探测能力的鸿蒙实现路径

在这些能力补齐之前，本章应视为鸿蒙书源开发的专项限制说明。
