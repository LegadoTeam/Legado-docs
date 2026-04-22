# legado.dom.parse / free

DOM 解析 API 基于 [scraper](https://crates.io/crates/scraper)（底层 html5ever / WHATWG HTML5 规范），采用**句柄机制**避免跨 JS↔Rust 边界序列化 DOM 树。

## legado.dom.parse

解析 HTML 字符串，返回文档句柄。

```js
legado.dom.parse(html) → string  // 文档句柄，如 "D0"
```

| 参数 | 类型 | 说明 |
|------|------|------|
| `html` | `string` | HTML 字符串 |

### 句柄格式

| 类型 | 格式 | 示例 |
|------|------|------|
| 文档句柄 | `"D{id}"` | `"D0"` |
| 元素句柄 | `"D{id}E{idx}"` | `"D0E3"` |

元素句柄可作为后续 `select`、`selectAll`、`text`、`attr` 等函数的第一个参数，实现子选择。

## legado.dom.free

释放文档句柄。

```js
legado.dom.free(handle) → void
```

::: tip 自动清理
`free()` 是可选的。即使不调用，线程结束后也会自动清理。但建议在处理完 DOM 后主动释放，减少内存占用。
:::

## 完整示例

```js
var html = await legado.http.get('https://example.com/book/123');
var doc = legado.dom.parse(html);

// 使用文档句柄进行查询
var title = legado.dom.selectText(doc, 'h1.title');
var cover = legado.dom.selectAttr(doc, '.cover img', 'src');

// 子选择：先选容器，再在容器内查找
var nav = legado.dom.select(doc, '.pagination');
if (nav) {
  var nextUrl = legado.dom.selectAttr(nav, 'a.next', 'href');
}

// 释放
legado.dom.free(doc);
```
