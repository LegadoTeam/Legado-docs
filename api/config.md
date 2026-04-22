# legado.config.*

脚本配置持久化 API。以 `scope` + `key` 维度存储数据，跨调用保持。

## 字符串读写

### legado.config.read

```js
legado.config.read(scope, key) → string
```

读取字符串值。键不存在时返回空字符串 `""`。

### legado.config.write

```js
legado.config.write(scope, key, value) → void
```

写入字符串值。

## 字节数组读写

### legado.config.readBytes

```js
legado.config.readBytes(scope, key) → number[]
```

读取字节数组。不存在时返回空数组。

### legado.config.writeBytes

```js
legado.config.writeBytes(scope, key, bytes) → void
```

写入字节数组（传入数字数组）。

## 参数说明

| 参数 | 类型 | 说明 |
|------|------|------|
| `scope` | `string` | 命名空间，建议使用书源文件名或域名 |
| `key` | `string` | 配置项名称 |
| `value` | `string` | 配置值 |
| `bytes` | `number[]` | 字节数组 |

## 示例

### Token 持久化

```js
var SCOPE = 'my_source.js';

// 写入
legado.config.write(SCOPE, 'token', 'eyJhbGciOiJSUzI1...');

// 读取
var token = legado.config.read(SCOPE, 'token');
if (!token) {
  token = login(); // 重新登录
}
```

### 存储复杂对象

```js
var SCOPE = 'my_source.js';

// 写入 JSON
var state = { token: 'abc', userId: 123, expire: Date.now() + 3600000 };
legado.config.write(SCOPE, 'state', JSON.stringify(state));

// 读取 JSON
var raw = legado.config.read(SCOPE, 'state');
var saved = raw ? JSON.parse(raw) : null;
```

### 记住用户选择

```js
var SCOPE = 'my_source.js';

// 在发现页设置中保存用户偏好
legado.config.write(SCOPE, 'preference', 'male');

// 在搜索中使用偏好
var pref = legado.config.read(SCOPE, 'preference') || 'male';
```

::: info CLI 兼容性
CLI 测试模式会启动隐藏的 Tauri 后端，`read/write` 与 `readBytes/writeBytes` 使用与 GUI 一致的持久化实现。
:::
