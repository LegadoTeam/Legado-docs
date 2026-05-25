# 字体反爬（queryTTF / queryTTFByName）

部分小说网站使用**自定义 TTF 字体混淆字符**来防止爬取：页面 HTML 里存放的不是真实汉字，而是私有区字符（如 `\uE000`），网站通过自定义字体把这些字符渲染成真实文字。爬虫直接读 HTML 只能得到乱码，必须先解析字体才能还原。

Tauri 引擎提供两种还原策略，对应**不同强度**的混淆手法。

## 混淆强度与推荐策略

| 混淆强度   | 特征                                          | 推荐函数         | 原理                          |
| ---------- | --------------------------------------------- | ---------------- | ----------------------------- |
| **低强度** | 字形名为 `uni6211` 格式，名称直接暴露真实码点 | `queryTTFByName` | 解析 glyph 名称中的 `uniXXXX` |
| **高强度** | 字形名混淆（如 `glyph001`），名称无法直接利用 | `queryTTF`       | 对比字形轮廓路径哈希          |

> **实践建议**：优先尝试 `queryTTFByName`，若返回空映射再 fallback 到 `queryTTF`。
> 绝大多数国内小说站使用低强度混淆，`queryTTFByName` 速度更快、结果更可靠。

## API 一览

| 函数                                       | 说明                                                |
| ------------------------------------------ | --------------------------------------------------- |
| `legado.queryTTFByName(base64)`            | glyph-name 法解析字体，适用于低强度混淆             |
| `legado.queryTTFByNameSync(base64)`        | 同上别名                                            |
| `legado.queryTTF(base64)`                  | 路径哈希法解析字体，适用于高强度混淆                |
| `legado.queryTTFSync(base64)`              | 同上别名                                            |
| `legado.http.getBinary(url, headers?)`     | 同步下载二进制文件，返回 base64（用于下载字体文件） |
| `legado.http.getBinarySync(url, headers?)` | 同上别名                                            |

> **关于 `Sync` 后缀**：同一对函数行为完全相同，`Sync` 后缀仅表示"HarmonyOS 端不可用"。

## 函数签名

```ts
// base64 编码的字体文件数据（TTF/OTF/WOFF2 均可）
legado.queryTTFByName(base64FontData: string): string
legado.queryTTF(base64FontData: string): string

// 返回 JSON 字符串，格式：{ "假字符": "真字符", ... }
// 例如：{ "\uE000": "我", "\uE001": "爱", "\uE002": "你" }
```

解析失败时抛出异常（如 base64 损坏、文件不是有效字体格式）。

## 工作原理

### 低强度混淆（queryTTFByName）

字体文件内部有一张 `cmap` 表，记录"Unicode 码点 → 字形 ID"，每个字形还有一个**名称**（来自 `post` 表）。

低强度混淆只是把码点映射到了别处，但字形名仍然是 `uni6211` 这样的格式，其中 `6211` 就是真实汉字"我"（`0x6211`）的 Unicode 码点：

```
cmap: 0xE000 → glyph#42
post: glyph#42 → "uni6211"
解析: 0x6211 → '我'
结果: { "\uE000": "我" }
```

等效 Python 代码（fontTools 方案）：

```python
from fontTools.ttLib import TTFont
font = TTFont("font.ttf")
cmap = font.getBestCmap()
decode_map = {}
for ext_cp, glyph_name in cmap.items():
    import re
    m = re.match(r'uni([0-9A-Fa-f]{4})', glyph_name)
    if m:
        decode_map[ext_cp] = chr(int(m.group(1), 16))
```

### 高强度混淆（queryTTF）

字形名被替换成随机字符串（如 `glyph00042`），无法直接读取，需要**对比字形的轮廓路径**：

1. 扫描字体 cmap，取出所有码点和对应字形
2. 对每个字形计算"路径哈希"（将轮廓坐标量化到 256×256 网格后 FNV-1a 哈希）
3. 路径哈希相同 → 两个字形"长一样"→ 如果其中一个是已知标准汉字，则另一个就是它的混淆替身

## 使用示例

### 基础：下载字体 + 还原文本

```js
// 1. 下载章节页面
const html = await legado.http.get(chapterUrl);

// 2. 从页面中提取字体 URL（具体正则依站点而定）
const fontUrl = html.match(/src: url\('([^']+\.ttf)'\)/)?.[1];
if (!fontUrl) throw new Error("未找到字体文件");

// 3. 下载字体（二进制 → base64）
const fontB64 = legado.http.getBinary(fontUrl);

// 4. 优先尝试 glyph-name 法（低强度）
let map = JSON.parse(legado.queryTTFByName(fontB64));

// 5. 若空映射则 fallback 路径哈希法（高强度）
if (Object.keys(map).length === 0) {
  map = JSON.parse(legado.queryTTF(fontB64));
}

// 6. 提取并还原章节文本
const encoded = /* DOM 提取的乱码文本 */;
const decoded = encoded.replace(/[\u0000-\uffff]/g, c => map[c] || c);
```

### 进阶：缓存字体映射（避免重复下载）

同一章节页往往多次复用同一字体文件：

```js
let _fontCache = {};

async function getFontMap(fontUrl) {
  if (_fontCache[fontUrl]) return _fontCache[fontUrl];
  const fontB64 = legado.http.getBinary(fontUrl);
  let map = JSON.parse(legado.queryTTFByName(fontB64));
  if (Object.keys(map).length === 0) {
    map = JSON.parse(legado.queryTTF(fontB64));
  }
  _fontCache[fontUrl] = map;
  return map;
}
```

### 进阶：仅替换 CJK 范围

有些站点只混淆了 CJK 汉字，英文数字保持原样，可缩窄替换范围：

```js
const decoded = encoded.replace(
  /[\u4e00-\u9fff\ue000-\uf8ff]/g,
  (c) => map[c] || c,
);
```

## Android 书源兼容

compat 层自动代理旧 Android 书源的字体 API，**无需修改书源代码**：

| 旧 Android API             | Tauri 等效操作                                    |
| -------------------------- | ------------------------------------------------- |
| `java.queryTTF(url)`       | 下载字体 → `queryTTFByName` → fallback `queryTTF` |
| `java.queryBase64TTF(b64)` | 直接 `queryTTFByName` → fallback `queryTTF`       |
| `java.replaceFont(html)`   | 对 HTML 中 CJK 字符逐个查表替换                   |

compat 层还会把映射结果存入 `_G.lastTTF`，`java.replaceFont` 调用时自动复用上次解析的映射。

## 注意事项

- 输入必须是 **base64 编码**的字体字节数据，不是字体文件 URL。下载字体用 `legado.http.getBinary(url)`。
- 支持 TTF、OTF、WOFF（内嵌 TTF/CFF）格式；WOFF2 需要先解压，目前直接传入 WOFF2 可能解析失败。
- `queryTTF`（路径哈希法）对于**空字形**（如空格）会跳过，不会产生误映射。
- 两个函数都仅映射**非标准字符 → 标准字符**，不会把正常汉字映射到其他字符。
