# legado.dom 工具方法

## legado.dom.selectByText

按文本内容查找元素。返回第一个文本包含指定字符串的元素。

```js
legado.dom.selectByText(handle, text) → string | null
```

| 参数 | 类型 | 说明 |
|------|------|------|
| `handle` | `string` | 文档/元素句柄 |
| `text` | `string` | 要查找的文本内容 |

### 典型用途：查找「下一页」链接

```js
var nextLink = legado.dom.selectByText(doc, '下一页');
var nextUrl = nextLink ? legado.dom.attr(nextLink, 'href') : null;
```

等价于原规则语法 `text.下一页@href`。

## legado.dom.remove

移除文档中所有匹配选择器的元素，返回清理后的 HTML。

```js
legado.dom.remove(handle, selector) → string
```

| 参数 | 类型 | 说明 |
|------|------|------|
| `handle` | `string` | 文档/元素句柄 |
| `selector` | `string` | 要移除的元素的 CSS 选择器 |

**返回值**：移除匹配元素后的 HTML 字符串。

### 示例：移除广告

```js
var cleanHtml = legado.dom.remove(doc, '.ad, .sponsor, #baidu_js_push');

// 重新解析清理后的 HTML
var cleanDoc = legado.dom.parse(cleanHtml);
var content = legado.dom.selectText(cleanDoc, '#content');
legado.dom.free(cleanDoc);
```

## 与原规则语法对照

| 原规则语法 | 等效 `legado.dom.*` 调用 |
|-----------|-------------------------|
| `id.content@html` | `dom.selectText(doc, "#content")` |
| `#content@textNodes` | `dom.ownText(el)` |
| `class.bookbox` | `dom.selectAll(doc, ".bookbox")` |
| `tag.a.0@href` | `dom.selectAttr(el, "a", "href")` |
| `[property="og:novel:author"]@content` | `dom.selectAttr(doc, '[property="og:novel:author"]', "content")` |
| `text.下一页@href` | `dom.selectByText(doc, "下一页")` → `dom.attr(el, "href")` |
| `dl@dd@a` | `dom.selectAll(doc, "dl > dd > a")` |
