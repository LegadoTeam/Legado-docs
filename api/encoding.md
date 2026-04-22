# 编码函数

引擎运行时完整支持标准 JavaScript 编码函数，书源应**直接使用标准语法**，无需通过 `legado.xxx` 包装调用。

## Base64

使用浏览器标准全局函数 `btoa()` / `atob()`：

```js
// 编码
var encoded = btoa('Hello World');
// "SGVsbG8gV29ybGQ="

// 解码
var decoded = atob('SGVsbG8gV29ybGQ=');
// "Hello World"
```

::: tip
`legado.base64Encode` / `legado.base64Decode` 作为兼容别名保留，等价于 `btoa` / `atob`。
:::

## URL 编码

使用 JavaScript 标准全局函数 `encodeURIComponent()` / `decodeURIComponent()`：

```js
// UTF-8 编码（大多数站点）
var q = encodeURIComponent('斗破苍穹');
var url = BASE + '/search?q=' + q;

// URL 解码
var original = decodeURIComponent('%E6%96%97%E7%A0%B4%E8%8B%8D%E7%A9%B9');
```

::: tip
`legado.urlEncode` / `legado.urlDecode` 作为兼容别名保留，等价于 `encodeURIComponent` / `decodeURIComponent`。
:::

### 非 UTF-8 字符集（GBK 等老旧站点）

部分老旧网站搜索参数需要 GBK 编码，标准 JS 不支持，使用专用 API：

```js
legado.urlEncodeCharset(str, charset) → string  // 指定字符集编码
```

```js
// GBK 编码（老旧站点）
var q = legado.urlEncodeCharset('斗破苍穹', 'gbk');
var url = BASE + '/search.php?keyword=' + q;
```

支持的 charset：`gbk` / `gb2312` / `gb18030` / `big5` / `euc-kr` / `shift_jis` 等。

## HTML 实体

```js
legado.htmlEncode(str) → string    // 字符 → HTML 实体
legado.htmlDecode(str) → string    // HTML 实体 → 字符
```

```js
legado.htmlEncode('<script>alert(1)</script>');
// "&lt;script&gt;alert(1)&lt;/script&gt;"

legado.htmlDecode('&lt;p&gt;Hello&lt;/p&gt;');
// "<p>Hello</p>"
```

## Base64 字节切片

```js
legado.base64ByteSlice(inputB64, start, end?) → string
```

对 base64 解码后的字节数组进行切片，再重新编码为 base64。用于拆分 `base64(IV || 密文)` 等场景。

```js
// 假设 data 是 base64(16字节IV + 密文)
var ivB64 = legado.base64ByteSlice(data, 0, 16);      // 前 16 字节 → IV
var cipherB64 = legado.base64ByteSlice(data, 16);      // 第 16 字节之后 → 密文
```
