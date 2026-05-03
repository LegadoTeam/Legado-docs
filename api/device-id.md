# 设备标识

Legado Tauri 提供两类设备标识，分别对应不同的生命周期与来源：

| 类型 | 函数 | 来源 | 生命周期 |
|------|------|------|---------|
| **硬件 UID**（Hardware UID） | `legado.runtime.getMachineUid()` | 操作系统底层接口 | 与设备硬件/系统绑定，**重装软件后不变** |
| **软 UUID**（Software UUID） | `legado.runtime.getMachineUUID()` | 首次启动随机生成并写入 `app_state.redb` | 与应用数据目录绑定，**卸载/清除数据后重置** |

---

## legado.runtime.getMachineUid

```js
legado.runtime.getMachineUid() → Promise<string>
```

获取当前设备的**稳定硬件标识**。

**工作原理：**

1. 调用 `tauri-plugin-machine-uid` 向操作系统请求硬件级设备 ID：
   - **Windows**：注册表 `HKLM\SOFTWARE\Microsoft\Cryptography\MachineGuid`
   - **macOS**：IOKit 平台 UUID
   - **Linux**：`/etc/machine-id` 或 `/var/lib/dbus/machine-id`
2. 若系统接口返回有效值，直接返回该硬件 UID。
3. 若插件不可用、权限受限或返回空值，**自动回落**到软 UUID（即 `getMachineUUID()` 的返回值）。

> 调用方无需手动处理回落逻辑，始终能得到一个非空字符串。

### 示例

```js
var uid = await legado.runtime.getMachineUid();
// 一般是系统级 UID，如: "8b3f2c1a-4d5e-6f7a-8b9c-0d1e2f3a4b5c"

// 用设备 ID 生成平台专属签名
var sign = await legado.md5(uid + secretKey);

// 作为请求头传给服务端
var result = await legado.http.get(url, {
  'X-Device-Id': await legado.runtime.getMachineUid()
});
```

---

## legado.runtime.getMachineUUID

```js
legado.runtime.getMachineUUID() → Promise<string>
```

直接获取应用本地的**软 UUID**，不尝试读取系统硬件 ID。

**工作原理：**

1. 应用**首次启动**时，Rust 端使用 `uuid` crate 生成一个 UUID v4。
2. 该 UUID 被写入应用数据目录下的 `app_state.redb`（键 `system_identity:fallback_uuid`）。
3. 后续每次调用直接从 `redb` 读取，保持稳定。
4. **卸载应用并清除数据目录**后，下次启动会重新生成。

> 不依赖任何系统权限，在所有平台上均可用。

### 示例

```js
var uuid = await legado.runtime.getMachineUUID();
// 格式: "550e8400-e29b-41d4-a716-446655440000" (UUID v4)

// 用于无需强绑定硬件的场景，如个性化配置同步
legado.config.write('my_source', 'install_id', uuid);
```

---

## 两种标识的选型指南

| 场景 | 推荐 |
|------|------|
| 平台账号鉴权、防盗链、跨版本稳定绑定 | `getMachineUid()` |
| 仅需区分不同安装实例、无跨平台需求 | `getMachineUUID()` |
| 不确定系统是否支持硬件 UID | `getMachineUid()`（自动回落） |

::: warning 隐私提示
设备标识是唯一性较强的信息。书源脚本应仅在平台明确要求设备鉴权时使用，不应在与设备身份无关的场景中采集或上传。
:::

---

## 能力探测

```js
// 检测硬件 UID 能力是否可用
if (legado.runtime.has('machineUid')) {
  var uid = await legado.runtime.getMachineUid();
}

// 软 UUID 始终可用（不需要检测，但可以检测）
if (legado.runtime.has('machineUUID')) {
  var uuid = await legado.runtime.getMachineUUID();
}
```

| 能力名 | 含义 |
|--------|------|
| `machineUid` | 硬件 UID 接口可用（`getMachineUid` 可能返回真实硬件 ID） |
| `machineUUID` | 软 UUID 接口可用（`getMachineUUID` 可直接调用） |
