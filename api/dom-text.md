# legado.dom.text / ownText / html / outerHtml / attr / tagName

元素内容读取函数。

## legado.dom.text

递归提取元素的全部文本内容（含嵌套子元素）。

```js
legado.dom.text(handle) → string
```

## legado.dom.ownText

仅提取元素的直接子文本节点（不含嵌套元素内的文本）。

```js
legado.dom.ownText(handle) → string
```

## legado.dom.html

获取元素的 innerHTML。

```js
legado.dom.html(handle) → string
```

## legado.dom.outerHtml

获取元素的 outerHTML（包含元素本身的标签）。

```js
legado.dom.outerHtml(handle) → string
```

## legado.dom.attr

读取元素的属性值。

```js
legado.dom.attr(handle, name) → string | null
```

| 参数 | 类型 | 说明 |
|------|------|------|
| `handle` | `string` | 元素句柄 |
| `name` | `string` | 属性名 |

**返回值**：属性值字符串，不存在时返回 `null`。

## legado.dom.tagName

获取元素的标签名（小写）。

```js
legado.dom.tagName(handle) → string
```

## 示例

```js
var doc = legado.dom.parse('<div class="box"><a href="/page"><b>标题</b>文本</a></div>');
var el = legado.dom.select(doc, 'a');

legado.dom.text(el);       // "标题文本"
legado.dom.ownText(el);    // "文本"（不含 <b> 内的文本）
legado.dom.html(el);       // "<b>标题</b>文本"
legado.dom.outerHtml(el);  // '<a href="/page"><b>标题</b>文本</a>'
legado.dom.attr(el, 'href');  // "/page"
legado.dom.tagName(el);    // "a"

legado.dom.free(doc);
```

## text vs ownText

```html
<div id="info">
  作者：张三
  <span>状态：连载中</span>
  最新：第100章
</div>
```

```js
var el = legado.dom.select(doc, '#info');
legado.dom.text(el);     // "作者：张三 状态：连载中 最新：第100章"
legado.dom.ownText(el);  // "作者：张三 最新：第100章"（不含 <span> 内容）
```
