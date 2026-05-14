# 深链接（Deep Link）

通过 `legado://` 协议链接，可以直接从浏览器或外部应用唤醒 Legado 桌面端，并自动触发安装书源、添加仓库或安装插件的操作。

## 链接格式

### 安装书源

```
legado://?url=<书源文件 URL>
```

`url` 参数可以多次编码，应用会自动解码。

**示例：**

```
legado://?url=https%3A%2F%2Fexample.com%2Fbooksources.json
```

也支持直接传入 `https://` 地址（省略 `legado://` 前缀）：

```
https://example.com/booksources.json
```

---

### 添加书源仓库

```
legado://repo?url=<仓库 URL>&name=<仓库默认名称>
```

| 参数 | 必填 | 说明 |
|------|------|------|
| `url` | ✅ | 仓库地址（`http` 或 `https`） |
| `name` | 可选 | 预填的仓库名称，用户可在弹窗中修改 |

**示例：**

```
legado://repo?url=https%3A%2F%2Fexample.com%2Frepo&name=%E7%A4%BA%E4%BE%8B%E4%BB%93%E5%BA%93
```

等价于：

```
legado://repo?url=https://example.com/repo&name=示例仓库
```

触发后会打开"添加仓库"弹窗，URL 和名称自动预填，确认后完成添加。

---

### 安装前端插件

```
legado://plugin?url=<插件脚本 URL>
```

| 参数 | 必填 | 说明 |
|------|------|------|
| `url` | ✅ | 插件 JS 文件地址（`http` 或 `https`） |

**示例：**

```
legado://plugin?url=https%3A%2F%2Fexample.com%2Fplugin.js
```

触发后会打开插件导入弹窗，URL 自动预填，确认后下载并安装插件。

---

## 在网页中嵌入

在书源仓库的网页或文档中，可以用普通的 `<a>` 标签嵌入深链接：

```html
<!-- 安装书源 -->
<a href="legado://?url=https://example.com/booksources.json">
  一键安装书源
</a>

<!-- 添加仓库 -->
<a href="legado://repo?url=https://example.com/repo&amp;name=示例仓库">
  一键添加仓库
</a>

<!-- 安装插件 -->
<a href="legado://plugin?url=https://example.com/plugin.js">
  一键安装插件
</a>
```

> **注意**：深链接仅在已安装并启动 Legado 桌面端的情况下有效。移动端（Android / HarmonyOS）暂不支持此协议。

## URL 编码说明

`url` 和 `name` 参数中的特殊字符（如 `:`、`/`、`?`、`&`、空格、中文等）必须经过 URL 编码。可使用浏览器控制台快速编码：

```js
encodeURIComponent('https://example.com/booksources.json')
// => "https%3A%2F%2Fexample.com%2Fbooksources.json"
```
