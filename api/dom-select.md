# legado.dom.select / selectAll

CSS 选择器查询。

## legado.dom.select

选择第一个匹配的元素，返回元素句柄。

```js
legado.dom.select(handle, selector) → string | null
```

| 参数 | 类型 | 说明 |
|------|------|------|
| `handle` | `string` | 文档句柄或元素句柄 |
| `selector` | `string` | CSS 选择器 |

**返回值**：元素句柄字符串，无匹配时返回 `null`。

## legado.dom.selectAll

选择所有匹配的元素，返回元素句柄数组。

```js
legado.dom.selectAll(handle, selector) → string[]
```

**返回值**：元素句柄字符串数组。

## 支持的 CSS 选择器

> 不通平台支持的语法不一致,windows和android 的tauri 分支支持的语法比较少,鸿蒙版本因为在标准webview 环境下  支持全部语法
基于标准 CSS 选择器语法，常用的包括：

| 选择器 | 示例 | 说明 |
|--------|------|------|
| 标签 | `a`、`div` | 标签名选择 |
| ID | `#content` | ID 选择 |
| 类 | `.book-item` | 类名选择 |
| 属性 | `[property="og:title"]` | 属性选择 |
| 后代 | `div .title` | 后代选择 |
| 子元素 | `ul > li` | 直接子元素 |
| 组合 | `.list a.active` | 组合选择 |
| 多选 | `h1, h2, h3` | 多个选择器 |
| 伪类 | `li:first-child` | 伪类选择 |

## 示例

### 基本选择

```js
var doc = legado.dom.parse(html);

// 选择单个元素
var title = legado.dom.select(doc, 'h1.book-title');
if (title) {
  var text = legado.dom.text(title);
}

// 选择所有匹配
var items = legado.dom.selectAll(doc, '.book-list li');
for (var i = 0; i < items.length; i++) {
  var name = legado.dom.text(items[i]);
}
```

### 子选择（在元素内查找）

```js
var container = legado.dom.select(doc, '.search-results');
if (container) {
  // 在 container 内部查找
  var links = legado.dom.selectAll(container, 'a.book-link');
}
```

### 属性选择器

```js
// Open Graph meta 标签
var ogTitle = legado.dom.select(doc, 'meta[property="og:title"]');
var ogImage = legado.dom.select(doc, 'meta[property="og:image"]');

// 自定义数据属性
var item = legado.dom.select(doc, '[data-book-id="123"]');
```
