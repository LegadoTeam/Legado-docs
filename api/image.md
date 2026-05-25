# legado.image.\*

图片处理 API，为漫画书源提供图片解码、裁剪、拼接、编码能力。句柄格式 `"I123"`，`thread_local!` 存储，引擎调用结束后自动清理。

## API 列表

| 函数                                                       | 说明                        | 返回值   |
| ---------------------------------------------------------- | --------------------------- | -------- |
| `legado.image.decode(base64)`                              | 解码 base64 图片 → 句柄     | `string` |
| `legado.image.create(w, h)`                                | 创建空白 RGBA 图片 → 句柄   | `string` |
| `legado.image.width(handle)`                               | 获取宽度                    | `number` |
| `legado.image.height(handle)`                              | 获取高度                    | `number` |
| `legado.image.crop(handle, x, y, w, h)`                    | 裁剪区域 → 新句柄           | `string` |
| `legado.image.paste(dest, src, x, y)`                      | 将 src 粘贴到 dest 的 (x,y) | `void`   |
| `legado.image.copyRegion(src, dest, sx, sy, w, h, dx, dy)` | 区域复制                    | `void`   |
| `legado.image.encode(handle, format?)`                     | 编码为 base64               | `string` |
| `legado.image.free(handle)`                                | 释放句柄                    | `void`   |
| `legado.image.qrCode(text, size?)`                         | 生成二维码 → 句柄           | `string` |
| `legado.image.qrCodeDataUrl(text, size?)`                  | 生成二维码 data URL         | `string` |
| `legado.image.jmDecode(srcHandle, num)`                    | 禁漫条带还原                | `string` |

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
var result = legado.image.encode(dest, "jpg");

// 释放
legado.image.free(img);
legado.image.free(cropped);
legado.image.free(dest);
```

## copyRegion 区域复制

将源图片的指定区域复制到目标图片的指定位置：

```js
legado.image.copyRegion(src, dest, sx, sy, w, h, dx, dy);
```

| 参数     | 说明             |
| -------- | ---------------- |
| `src`    | 源图片句柄       |
| `dest`   | 目标图片句柄     |
| `sx, sy` | 源图片起始坐标   |
| `w, h`   | 复制区域大小     |
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
    legado.image.copyRegion(
      img,
      dest,
      0,
      i * sliceH,
      w,
      sliceH,
      0,
      (9 - i) * sliceH,
    );
  }

  var result = legado.image.encode(dest, "jpg");
  legado.image.free(img);
  legado.image.free(dest);
  return result; // 返回处理后的 base64，返回 null 保留原图
}
```

## 二维码生成

### legado.image.qrCode

生成二维码图片，返回图片句柄。

```js
legado.image.qrCode(text, size?) → string
```

| 参数   | 类型     | 说明                                        |
| ------ | -------- | ------------------------------------------- |
| `text` | `string` | 要编码的文本内容                            |
| `size` | `number` | 图片尺寸（像素，正方形），传 `0` 使用默认值 |

### legado.image.qrCodeDataUrl

生成二维码并直接返回 `data:image/png;base64,...` 格式的 Data URL，无需手动 encode。

```js
legado.image.qrCodeDataUrl(text, size?) → string
```

### 示例

```js
// 生成二维码并编码输出
var handle = legado.image.qrCode("https://example.com/pay?id=123", 256);
var base64 = legado.image.encode(handle, "png");
legado.image.free(handle);

// 直接获取 data URL（更便捷）
var dataUrl = legado.image.qrCodeDataUrl("https://example.com/pay?id=123", 256);
// 返回 "data:image/png;base64,iVBORw0KGgo..."
```

## jmDecode 禁漫条带还原

`legado.image.jmDecode` 是禁漫天堂（JM）专用的图片还原函数。禁漫图片在传输时将水平条带打乱，此函数按 `num` 个条带等分后重排还原。

```js
legado.image.jmDecode(srcHandle, num) → string
```

| 参数        | 类型     | 说明                                              |
| ----------- | -------- | ------------------------------------------------- |
| `srcHandle` | `string` | 源图片句柄（调用后 srcHandle 自动释放，不可再用） |
| `num`       | `number` | 条带数量（图片高度将被等分为 num 个水平条带）     |

::: warning 句柄消耗
`jmDecode` 会**消耗**（释放）传入的 `srcHandle`，调用后不可再对该句柄进行其他操作。
:::

### 示例

```js
function processImage(base64Data, pageIndex, imageUrl) {
  var img = legado.image.decode(base64Data);
  // num 值由禁漫页面 JS 计算，通常与图片高度相关
  var num = computeJmNum(legado.image.height(img));
  var restored = legado.image.jmDecode(img, num); // img 句柄在此释放
  var result = legado.image.encode(restored, "jpg");
  legado.image.free(restored);
  return result;
}
```
