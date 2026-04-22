# legado.dom2（对象风格 DOM 兼容层）

`legado.dom2` 是在 **不改变现有 `legado.dom` 句柄式 API** 前提下，额外提供的一套对象风格 DOM 包装。

适用场景：

- 新写的 Tauri 书源，希望用更接近普通 JavaScript 的 DOM 调用方式
- 需要在不改 Rust DOM 原语接口的前提下，做对象化封装

不适用场景：

- 已经基于 `legado.dom` 句柄 API 编写并稳定运行的现有书源
- 需要与尚未补齐该兼容层的其他平台完全保持同一写法的场景

::: warning 兼容性说明
`legado.dom2` 是 **新增兼容层入口**，不是对 `legado.dom` 的替代。

- `legado.dom` 仍保持原有句柄式 API，不变
- `legado.dom2` 目前主要用于 Tauri 兼容层
- 如果你的书源需要兼顾尚未补齐该入口的平台，请继续优先使用 `legado.dom`
:::

## 设计原则

- **不覆盖旧 API**：`legado.dom` 原接口保持不变
- **JS 层包装**：对象风格封装只在 JS 兼容层完成，Rust 底层原语不变
- **临时句柄**：每次方法调用时临时解析底层句柄，调用结束后立即释放

## 基本用法

```js
var doc = legado.dom2.parse(html);

var title = doc.selectText('h1.title');
var cover = doc.selectAttr('.cover img', 'src');

var nav = doc.select('.pagination');
var nextUrl = nav ? nav.selectAttr('a.next', 'href') : null;
if (nav) nav.free();

doc.free();
```

## API 形态

### 入口

```js
legado.dom2.parse(html) -> DomObject
legado.dom2.free(doc) -> void
```

### DomObject 方法

| 方法 | 返回值 | 说明 |
|------|--------|------|
| `doc.select(selector)` | `DomObject \| null` | 选择第一个匹配元素 |
| `doc.selectAll(selector)` | `DomObject[]` | 选择所有匹配元素 |
| `doc.text()` | `string` | 获取全部文本 |
| `doc.ownText()` | `string` | 获取直接文本节点 |
| `doc.html()` | `string` | 获取 innerHTML |
| `doc.outerHtml()` | `string` | 获取 outerHTML |
| `doc.attr(name)` | `string \| null` | 获取属性 |
| `doc.tagName()` | `string` | 获取标签名 |
| `doc.selectText(selector)` | `string \| null` | 快捷：`select + text` |
| `doc.selectAttr(selector, attr)` | `string \| null` | 快捷：`select + attr` |
| `doc.selectAllTexts(selector)` | `string[]` | 快捷：批量文本 |
| `doc.selectAllAttrs(selector, attr)` | `string[]` | 快捷：批量属性 |
| `doc.selectAllOuterHtmls(selector)` | `string[]` | 快捷：批量 outerHTML |
| `doc.selectByText(text)` | `DomObject \| null` | 按文本查找 |
| `doc.remove(selector)` | `string` | 移除节点后返回清理后的 HTML |
| `doc.free()` | `void` | 释放对象快照 |

## 生命周期与释放语义

这是这套 API 最重要的限制：

- `DomObject` 保存的是 **HTML 快照**
- 每次调用 `select()`、`text()`、`attr()` 这类方法时，兼容层都会：
  1. 临时把快照重新解析为底层 DOM 句柄
  2. 执行本次查询或读取
  3. **在当前调用结束后立即释放底层句柄**

因此要明确：

- `legado.dom2` 不是 live DOM
- 不能依赖“长期持有某个底层节点句柄”的语义
- `remove()` 不会原地修改当前对象，而是返回新的 HTML 字符串；如需继续查询，应重新 `parse()`

示例：

```js
var doc = legado.dom2.parse(html);
var cleanHtml = doc.remove('.ad, script');
doc.free();

var cleanDoc = legado.dom2.parse(cleanHtml);
var text = cleanDoc.selectText('#content');
cleanDoc.free();
```

## 与 legado.dom 的关系

### 旧写法：保持不变

```js
var doc = legado.dom.parse(html);
var text = legado.dom.selectText(doc, '#content');
legado.dom.free(doc);
```

### 新写法：对象风格

```js
var doc = legado.dom2.parse(html);
var text = doc.selectText('#content');
doc.free();
```

### 选择建议

- 要兼容已有书源和现有跨平台文档，优先继续用 `legado.dom`
- 要在 Tauri 端尝试对象风格、降低句柄式写法的心智负担，可使用 `legado.dom2`

## 底层原语

`legado.dom2` 内部会保留一份底层 DOM 原语引用：

```js
legado.dom2.__raw
```

它是兼容层内部桥接用的底层入口，普通书源脚本不应依赖它。
