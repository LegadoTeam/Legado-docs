# legado.dom 快捷方法

将 `select` + 属性/文本读取合并为一步调用的快捷函数。

## legado.dom.selectText

选择第一个匹配元素并返回其文本内容。

```js
legado.dom.selectText(handle, selector) → string | null
```

等价于：
```js
var el = legado.dom.select(handle, selector);
var text = el ? legado.dom.text(el) : null;
```

## legado.dom.selectAttr

选择第一个匹配元素并返回其属性值。

```js
legado.dom.selectAttr(handle, selector, attrName) → string | null
```

## legado.dom.selectAllTexts

选择所有匹配元素，返回文本数组。

```js
legado.dom.selectAllTexts(handle, selector) → string[]
```

## legado.dom.selectAllAttrs

选择所有匹配元素，返回属性值数组。

```js
legado.dom.selectAllAttrs(handle, selector, attrName) → string[]
```

## legado.dom.selectAllOuterHtmls

选择所有匹配元素，返回 outerHTML 数组。

```js
legado.dom.selectAllOuterHtmls(handle, selector) → string[]
```

## 示例

```js
var doc = legado.dom.parse(html);

// 单元素快捷
var title = legado.dom.selectText(doc, 'h1.title');
var cover = legado.dom.selectAttr(doc, '.cover img', 'src');
var ogDesc = legado.dom.selectAttr(doc, '[property="og:description"]', 'content');

// 批量快捷
var chapterNames = legado.dom.selectAllTexts(doc, '#list a');
var chapterUrls = legado.dom.selectAllAttrs(doc, '#list a', 'href');
var bookHtmls = legado.dom.selectAllOuterHtmls(doc, '.book-card');

// 组合使用构建章节列表
var chapters = [];
for (var i = 0; i < chapterNames.length; i++) {
  chapters.push({
    name: chapterNames[i],
    url: chapterUrls[i]
  });
}

legado.dom.free(doc);
```

::: tip 性能建议
快捷方法比先 `select` 再 `text/attr` 更高效，因为只需一次 JS↔Rust 跨境调用。优先使用快捷方法。
:::
