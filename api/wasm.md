# legado.wasm.\*

`legado.wasm.*` 用于把部分签名、哈希、解密、混淆还原等算法打包为 WebAssembly，在 Boa 书源脚本里同步调用。它不是浏览器原生 `WebAssembly` 对象，而是 Legado Tauri 提供的宿主 API：JS 负责加载和传参，Rust 侧用 `wasmi` 执行 wasm。

可用性探测：

```js
if (legado.runtime.has("wasm")) {
  // 可以使用 legado.wasm.*
}
```

## API 列表

| 函数                                      | 说明                                                                           | 返回值                               |
| ----------------------------------------- | ------------------------------------------------------------------------------ | ------------------------------------ |
| `legado.wasm.load(module, bytesOrBase64)` | 加载 wasm 二进制，`bytesOrBase64` 可为 base64、`Array<number>` 或 `Uint8Array` | `void`                               |
| `legado.wasm.loadBase64(module, base64)`  | `load()` 的 base64 便捷入口                                                    | `void`                               |
| `legado.wasm.has(module)`                 | 模块是否已加载                                                                 | `boolean`                            |
| `legado.wasm.unload(module)`              | 卸载模块                                                                       | `boolean`                            |
| `legado.wasm.moduleBytes(module)`         | 已加载模块字节数，不存在返回 `null`                                            | `number \| null`                     |
| `legado.wasm.callI32(module, func, a, b)` | 调用 `(i32, i32) -> i32` 导出函数                                              | `number`                             |
| `legado.wasm.call(module, func, a, b)`    | `callI32()` 别名                                                               | `number`                             |
| `legado.wasm.invoke(options)`             | 数字 ABI 或 JSON ABI 的统一入口                                                | `number \| string \| object \| null` |
| `legado.wasm.invokeJson(options)`         | JSON ptr-len ABI 入口                                                          | `object \| string \| null`           |

当前单个 wasm 模块最大 8 MiB，JSON ABI 单次输入/输出最大 16 MiB。模块缓存跟随当前 Boa Context，书源重新加载后需要重新 `load()`。

## 数字 ABI

最稳的第一层 ABI 是数字参数。wasm 原生只直接支持 `i32`、`i64`、`f32`、`f64`，因此适合 CRC、位运算、轻量 hash、简单混淆计算等场景。

```js
legado.wasm.loadBase64("math", WASM_BASE64);

var r1 = legado.wasm.callI32("math", "add", 10, 20);
var r2 = legado.wasm.invoke({
  module: "math",
  func: "add",
  args: [10, 20],
  returns: "i32",
});
```

对应 WAT：

```wat
(module
  (func $add (param i32 i32) (result i32)
    local.get 0
    local.get 1
    i32.add
  )
  (export "add" (func $add))
)
```

`invoke()` 会读取 wasm 导出函数的真实签名并按签名转换参数。`i64` 返回值会以字符串返回，避免 JS `number` 精度丢失。

## JSON ABI

需要传字符串、对象、数组或返回复杂结果时，使用 JSON ptr-len ABI。JS 对象会先 `JSON.stringify`，Rust 写入 wasm memory，调用导出函数，再从 wasm memory 读取返回内容。

wasm 模块需要导出：

```text
memory
alloc(len: i32) -> i32
dealloc(ptr: i32, len: i32)
handle(ptr: i32, len: i32) -> i64
```

`handle()` 返回的 `i64` 高 32 位是输出 ptr，低 32 位是输出 len。

```js
legado.wasm.loadBase64("sign", SIGN_WASM_BASE64);

var result = legado.wasm.invoke({
  module: "sign",
  func: "handle",
  input: {
    url: url,
    method: "GET",
    timestamp: Date.now(),
  },
  returns: "json",
});

var token = result.token;
```

如果 wasm 返回普通文本而不是 JSON，可指定 `returns: 'string'`：

```js
var token = legado.wasm.invokeJson({
  module: "sign",
  input: { url: url, ts: Date.now() },
  returns: "string",
});
```

## Rust wasm 示例

下面是面向 `wasm32-unknown-unknown` 的最小 JSON ABI 形状。真实项目可以在 `handle()` 内使用 `serde_json` 解析输入并生成输出。

```rust
#[no_mangle]
pub extern "C" fn alloc(len: i32) -> i32 {
  let mut buf = vec![0_u8; len as usize];
    let ptr = buf.as_mut_ptr();
    core::mem::forget(buf);
    ptr as i32
}

#[no_mangle]
pub extern "C" fn dealloc(ptr: i32, len: i32) {
    if ptr != 0 && len > 0 {
        unsafe { drop(Vec::from_raw_parts(ptr as *mut u8, len as usize, len as usize)); }
    }
}

#[no_mangle]
pub extern "C" fn handle(ptr: i32, len: i32) -> i64 {
    let input = unsafe { core::slice::from_raw_parts(ptr as *const u8, len as usize) };
    let text = core::str::from_utf8(input).unwrap_or("{}");
    let output = format!(r#"{{"echo":{}}}"#, text);

  let out_len = output.len() as u32;
  let out_ptr = Box::into_raw(output.into_bytes().into_boxed_slice()) as *mut u8 as u32;

    ((out_ptr as i64) << 32) | (out_len as i64)
}
```

## 使用建议

- 优先用 `callI32()` 或数字 `invoke()` 验证 wasm 模块可运行，再升级到 JSON ABI。
- wasm 适合放纯算法，不适合直接做 HTTP、DOM、Cookie、文件访问；这些能力继续用 `legado.http.*`、`legado.dom.*` 等宿主 API。
- 当前执行是同步的，长时间循环会阻塞本次书源脚本；算法应保持可预期耗时。
- 第一版每次调用都会重新实例化模块，适合小型算法和签名计算。需要跨调用状态时，把状态放在 JS 或配置里，不要依赖 wasm 实例常驻。
- 目前不注入 WASI，也不解析 wasm import。模块应尽量编译为无 import 的 `wasm32-unknown-unknown` 产物。
