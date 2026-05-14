# 图片处理 (processImage)

漫画书源可定义 `processImage()` 回调函数，用于在图片下载后自动进行处理（解密、还原、水印移除等）。

## 触发条件

- 漫画图片缓存模式开启（`comic_cache_enabled = true`，默认开启）
- 书源定义了 `processImage` 函数
- Rust 下载每张图片后自动检测并在独立 OS 线程 + Boa 引擎中调用

## 函数签名

```js
function processImage(base64Data, pageIndex, imageUrl) → string | null
```

| 参数 | 类型 | 说明 |
|------|------|------|
| `base64Data` | `string` | 原始图片的 Base64 编码 |
| `pageIndex` | `number` | 图片索引（从 0 开始） |
| `imageUrl` | `string` | 原始图片 URL（含 fragment 信息） |

| 返回值 | 说明 |
|--------|------|
| Base64 字符串 | 保存处理后的图片 |
| `null` | 保持原始图片不处理 |

## 典型场景：分割还原

部分漫画站对图片进行分条打乱加密，需要还原：

```js
function processImage(base64Data, pageIndex, imageUrl) {
  var img = legado.image.decode(base64Data);
  var w = legado.image.width(img);
  var h = legado.image.height(img);

  var SLICES = 10;
  var sliceH = Math.floor(h / SLICES);
  var dest = legado.image.create(w, h);

  // 逆序拼接条带
  for (var i = 0; i < SLICES; i++) {
    legado.image.copyRegion(
      img, dest,
      0, i * sliceH, w, sliceH,        // 源区域
      0, (SLICES - 1 - i) * sliceH      // 目标位置
    );
  }

  var result = legado.image.encode(dest, 'jpg');
  legado.image.free(img);
  legado.image.free(dest);
  return result;
}
```

## 使用 imageUrl fragment 信息

部分站点在图片 URL 的 fragment 中编码打乱参数：

```js
function processImage(base64Data, pageIndex, imageUrl) {
  // 从 URL fragment 中提取参数
  var hash = imageUrl.split('#')[1];
  if (!hash) return null; // 无 fragment，不处理

  var params = JSON.parse(decodeURIComponent(hash));
  var order = params.order; // 条带顺序数组

  var img = legado.image.decode(base64Data);
  var w = legado.image.width(img);
  var h = legado.image.height(img);
  var sliceH = Math.floor(h / order.length);
  var dest = legado.image.create(w, h);

  for (var i = 0; i < order.length; i++) {
    legado.image.copyRegion(
      img, dest,
      0, order[i] * sliceH, w, sliceH,
      0, i * sliceH
    );
  }

  var result = legado.image.encode(dest, 'jpg');
  legado.image.free(img);
  legado.image.free(dest);
  return result;
}
```

## 注意事项

- `processImage` 在独立线程中执行，不与主书源 Context 共享状态
- 处理图片可能较耗时，建议只做必要的操作
- 返回 `null` 可以有条件地跳过处理（如某些页不需要还原）
- 未定义 `processImage` 时保持原有轻量异步下载路径，无额外开销

---

# 图片下载前钩子 (prepareImage)

漫画书源可定义 `prepareImage()` 函数，**在每张图片下载前**调用，用于覆盖图片 URL 和/或注入自定义请求头（Referer、Origin、Cookie 等）。

## 触发条件

- 书源定义了 `prepareImage` 函数（有无 `processImage` 均可）
- 触发后进入「带引擎下载路径」：独立 OS 线程 + Boa 引擎串行调用，Phase 1 完成后 tokio 并发下载

## 函数签名

```js
function prepareImage(url, pageIndex) → { url?, headers? } | null
```

| 参数 | 类型 | 说明 |
|------|------|------|
| `url` | `string` | 原始图片 URL（来自 `chapterContent` 返回的数组） |
| `pageIndex` | `number` | 图片索引（从 0 开始） |

| 返回字段 | 类型 | 说明 |
|----------|------|------|
| `url` | `string?` | 覆盖实际下载地址；省略或 `null` 则使用原始 URL |
| `headers` | `object?` | 追加或覆盖请求头（同名键覆盖，新键追加） |

返回 `null` / `undefined` 相当于不做任何覆盖。

## 默认请求头行为

未定义 `prepareImage` 时，Rust 为每张图片构建以下默认头：

| 请求头 | 默认值 | 说明 |
|--------|--------|------|
| `User-Agent` | 域名绑定 UA 或全局配置 | 模拟浏览器 |
| `Accept` | `image/avif,image/webp,...` | 图片类型优先 |
| `Referer` | `chapterUrl`（章节 URL） | ⚠️ 若章节 URL 非 HTTP 格式（如管道分隔键），此字段为无效值 |
| `Cookie` | 该域名已存储的 Cookie | 自动注入 |

`prepareImage` 返回的 `headers` 会以**同名覆盖、新键追加**的规则合并到上述默认头中。

## 典型用法：注入 Referer / Origin

```js
function prepareImage(url, pageIndex) {
  return {
    headers: {
      'Referer': BASE + '/',
      'Origin': BASE
    }
  };
}
```

## 覆盖 URL + 注入请求头

```js
function prepareImage(url, pageIndex) {
  // 某些站点图片需要带签名参数
  var signed = url + '?token=' + legado.config.read('my-source', 'token');
  return {
    url: signed,
    headers: {
      'Referer': BASE + '/',
      'Authorization': 'Bearer ' + legado.config.read('my-source', 'token')
    }
  };
}
```

## 同时使用 prepareImage 和 processImage

两者可同时定义，执行顺序为：

```
prepareImage(url, i)          → 确定下载 URL 和请求头
  ↓ Rust 下载图片字节
processImage(base64, i, url)  → 对下载结果做解密/拼接处理
```

```js
function prepareImage(url, pageIndex) {
  return { headers: { 'Referer': BASE + '/' } };
}

function processImage(base64Data, pageIndex, imageUrl) {
  var img = legado.image.decode(base64Data);
  // 解密逻辑...
  var result = legado.image.encode(img, 'jpg');
  legado.image.free(img);
  return result;
}
```

## 注意事项

- `prepareImage` 在 Boa 引擎中**串行**执行（Phase 1），执行完所有页后才开始并发下载，建议保持轻量（不做网络请求）
- `url` 字段中的 fragment（`#...`）仅供 JS 逻辑使用，不会发送到服务器（Rust 下载前自动去除）
- 函数可以是同步或 `async`，引擎均可正确处理
