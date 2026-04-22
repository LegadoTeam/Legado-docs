# 加密 / 解密

## AES

### legado.aesEncrypt

AES 加密，返回 Base64 编码的密文。

```js
legado.aesEncrypt(data, key, iv?, mode?) → Promise<string>
```

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `data` | `string` | ✅ | 明文数据 |
| `key` | `string` | ✅ | 密钥（UTF-8 字符串） |
| `iv` | `string` | 否 | 初始化向量（UTF-8 字符串） |
| `mode` | `string` | 否 | 模式：`'CBC'`（默认）或 `'ECB'` |

### legado.aesDecrypt

AES 解密。

```js
legado.aesDecrypt(data, key, iv?, mode?) → Promise<string>
```

| 参数 | 类型 | 说明 |
|------|------|------|
| `data` | `string` | Base64 编码的密文 |
| `key` | `string` | 密钥 |
| `iv` | `string` | 初始化向量（UTF-8 字符串） |
| `mode` | `string` | 模式 |

### legado.aesDecryptB64Iv

AES 解密，IV 为 Base64 编码的原始字节。适用于服务端随机生成的二进制 IV。

```js
legado.aesDecryptB64Iv(cipher, key, ivB64, mode?) → Promise<string>
```

### 示例

以下示例默认位于 `async function` 内。

```js
// CBC 模式加密
var encrypted = await legado.aesEncrypt('hello', 'my-secret-key-16', 'my-iv-string-16', 'CBC');

// CBC 模式解密
var decrypted = await legado.aesDecrypt(encrypted, 'my-secret-key-16', 'my-iv-string-16', 'CBC');

// ECB 模式（无 IV）
var encrypted = await legado.aesEncrypt('hello', 'my-secret-key-16', '', 'ECB');

// 二进制 IV 解密
var ivB64 = legado.base64ByteSlice(data, 0, 16);   // 从组合数据中提取 IV
var cipher = legado.base64ByteSlice(data, 16);       // 提取密文
var plain = await legado.aesDecryptB64Iv(cipher, key, ivB64, 'CBC');
```

## DES

### legado.desEncrypt

DES-CBC 加密。

```js
legado.desEncrypt(data, key, iv?) → Promise<string>
```

### legado.desDecrypt

DES-CBC 解密。

```js
legado.desDecrypt(data, key, iv?) → Promise<string>
```

### 示例

```js
var encrypted = await legado.desEncrypt('hello', 'my8bytes', 'my8bytes');
var decrypted = await legado.desDecrypt(encrypted, 'my8bytes', 'my8bytes');
```
