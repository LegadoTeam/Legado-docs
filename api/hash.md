# 哈希函数

## legado.md5

计算 MD5 哈希，返回 32 位十六进制字符串。

```js
legado.md5(str) → Promise<string>
```

```js
await legado.md5('hello');
// "5d41402abc4b2a76b9719d911017c592"
```

## legado.sha1

计算 SHA-1 哈希。

```js
legado.sha1(str) → Promise<string>
```

```js
await legado.sha1('hello');
// "aaf4c61ddcc5e8a2dabede0f3b482cd9aea9434d"
```

## legado.sha256

计算 SHA-256 哈希。

```js
legado.sha256(str) → Promise<string>
```

```js
await legado.sha256('hello');
// "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824"
```

## legado.hmacSha256

HMAC-SHA256 消息认证码。

```js
legado.hmacSha256(data, key) → Promise<string>
```

::: info
以下示例默认位于 `async function` 内。
:::

| 参数 | 类型 | 说明 |
|------|------|------|
| `data` | `string` | 数据字符串 |
| `key` | `string` | 密钥字符串 |

```js
var mac = await legado.hmacSha256('message', 'secret-key');
```
