# ChapterInfo

`chapterList()` 返回的章节数据结构。

## 字段

| 字段       | 类型               | 必填 | 说明                                         |
| ---------- | ------------------ | ---- | -------------------------------------------- |
| `name`     | `string`           | ✅   | 章节名                                       |
| `url`      | `string`           | ✅   | 章节 URL                                     |
| `group`    | `string`           | 否   | 分组名（视频多线路时使用）                   |
| `vip`      | `boolean`          | 否   | 是否为 VIP / 付费章节，默认 `false`          |
| `price`    | `string \| number` | 否   | 章节价格或消耗点数，仅用于展示和传给购买函数 |
| `currency` | `string`           | 否   | 价格单位，如 `点`、`书币`、`币`              |

## 基本示例

```js
return [
  { name: "第1章 初入学院", url: "https://example.com/chapter/1" },
  { name: "第2章 修炼开始", url: "https://example.com/chapter/2" },
  { name: "第3章 突破", url: "https://example.com/chapter/3" },
];
```

## VIP 章节

```js
return [
  { name: "第1章 免费试读", url: "https://example.com/chapter/1" },
  {
    name: "第2章 风暴之前",
    url: "https://example.com/chapter/2",
    vip: true,
    price: 12,
    currency: "书币",
  },
];
```

带 `vip: true` 的章节不会自动购买。应用只会在读取失败且书源实现了 `purchaseChapter()` 时，提示用户确认购买。

## 视频多线路

```js
return [
  { name: "第01集", url: "https://play1.com/ep1.m3u8", group: "线路1" },
  { name: "第02集", url: "https://play1.com/ep2.m3u8", group: "线路1" },
  { name: "第01集", url: "https://play2.com/ep1.m3u8", group: "线路2" },
  { name: "第02集", url: "https://play2.com/ep2.m3u8", group: "线路2" },
];
```

::: danger 排序要求
返回的数组**必须正序排列**（第一章/第一集在前）。
:::
