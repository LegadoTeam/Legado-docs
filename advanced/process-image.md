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
