# legado.image.*

图片处理 API，为漫画书源提供图片解码、裁剪、拼接、编码能力。句柄格式 `"I123"`，`thread_local!` 存储，引擎调用结束后自动清理。

## API 列表

| 函数 | 说明 | 返回值 |
|------|------|--------|
| `legado.image.decode(base64)` | 解码 base64 图片 → 句柄 | `string` |
| `legado.image.create(w, h)` | 创建空白 RGBA 图片 → 句柄 | `string` |
| `legado.image.width(handle)` | 获取宽度 | `number` |
| `legado.image.height(handle)` | 获取高度 | `number` |
| `legado.image.crop(handle, x, y, w, h)` | 裁剪区域 → 新句柄 | `string` |
| `legado.image.paste(dest, src, x, y)` | 将 src 粘贴到 dest 的 (x,y) | `void` |
| `legado.image.copyRegion(src, dest, sx, sy, w, h, dx, dy)` | 区域复制 | `void` |
| `legado.image.encode(handle, format?)` | 编码为 base64 | `string` |
| `legado.image.free(handle)` | 释放句柄 | `void` |

### format 参数

`encode()` 的 `format` 参数支持：`'jpg'`（默认）、`'png'`、`'gif'`、`'webp'`。

## 基本用法

```js
// 解码图片
var img = legado.image.decode(base64Data);
var w = legado.image.width(img);
var h = legado.image.height(img);

// 裁剪
var cropped = legado.image.crop(img, 0, 0, w, Math.floor(h / 2));

// 创建新画布并拼接
var dest = legado.image.create(w, h);
legado.image.paste(dest, cropped, 0, 0);

// 编码输出
var result = legado.image.encode(dest, 'jpg');

// 释放
legado.image.free(img);
legado.image.free(cropped);
legado.image.free(dest);
```

## copyRegion 区域复制

将源图片的指定区域复制到目标图片的指定位置：

```js
legado.image.copyRegion(src, dest, sx, sy, w, h, dx, dy)
```

| 参数 | 说明 |
|------|------|
| `src` | 源图片句柄 |
| `dest` | 目标图片句柄 |
| `sx, sy` | 源图片起始坐标 |
| `w, h` | 复制区域大小 |
| `dx, dy` | 目标图片起始坐标 |

## processImage 回调

漫画书源可定义 `processImage()` 函数，图片下载后自动调用：

```js
function processImage(base64Data, pageIndex, imageUrl) {
  var img = legado.image.decode(base64Data);
  var w = legado.image.width(img);
  var h = legado.image.height(img);

  // 示例：分割还原（将 10 个条带逆序拼接）
  var dest = legado.image.create(w, h);
  var sliceH = Math.floor(h / 10);
  for (var i = 0; i < 10; i++) {
    legado.image.copyRegion(img, dest, 0, i * sliceH, w, sliceH, 0, (9 - i) * sliceH);
  }

  var result = legado.image.encode(dest, 'jpg');
  legado.image.free(img);
  legado.image.free(dest);
  return result;  // 返回处理后的 base64，返回 null 保留原图
}
```
