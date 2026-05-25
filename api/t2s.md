# 繁简转换（t2s / s2t）

基于 [zhconv](https://crates.io/crates/zhconv)（MediaWiki 规则集）的繁体中文与简体中文互转。

> **Tauri 专属**：以下 API 仅在 Tauri/Boa 引擎中可用，对应 Android 书源的 `java.t2s` / `java.s2t`。

## API 一览

| 函数                   | 说明                                       |
| ---------------------- | ------------------------------------------ |
| `legado.t2s(text)`     | 繁体中文 → 简体中文                        |
| `legado.t2sSync(text)` | 同上，带 `Sync` 后缀的别名（两者完全等价） |
| `legado.s2t(text)`     | 简体中文 → 繁体中文                        |
| `legado.s2tSync(text)` | 同上别名                                   |

> **关于 `Sync` 后缀**：`Sync` 后缀仅表示"HarmonyOS 端不可用"，两个别名行为完全相同。

## 函数签名

```ts
legado.t2s(text: string): string   // 繁体 → 简体
legado.s2t(text: string): string   // 简体 → 繁体
```

非字符串参数会被强制转换为字符串；转换本身不会抛出异常。

## 示例

### 基本用法

```js
legado.t2s("繁體中文"); // → "繁体中文"
legado.t2s("臺灣"); // → "台湾"
legado.t2s("電腦軟體"); // → "电脑软件"

legado.s2t("繁体中文"); // → "繁體中文"
legado.s2t("软件"); // → "軟體"
```

### 在书源中转换章节标题或内容

```js
// 将繁体站点内容统一转为简体
const html = await legado.http.get(chapterUrl);
const simplified = legado.t2s(html);
// 再做 DOM 解析...
```

### 搜索时做繁简兼容

部分繁体站点收录简体关键词时需先转换：

```js
const keyword_trad = legado.s2t(keyword); // 简体关键词 → 繁体
const url = BASE + "/search?q=" + encodeURIComponent(keyword_trad);
```

## 规则说明

zhconv 使用 MediaWiki（维基百科）的繁简转换规则集，包含：

- 标准字形转换（字体级别）
- 词汇差异转换（如：軟體 ↔ 软件，資訊 ↔ 信息）
- 地区变体（台湾、香港、大陆）

目前暴露的是大陆标准简体（`ZhHans`）和标准繁体（`ZhHant`），不区分台湾/香港子变体。

## Android 书源兼容

compat 层自动将 `java.t2s(text)` / `java.s2t(text)` 代理到本 API：

```js
// 旧 Android 书源写法（compat 层自动处理）
java.t2s("繁體中文"); // → "繁体中文"
java.s2t("繁体中文"); // → "繁體中文"
```
