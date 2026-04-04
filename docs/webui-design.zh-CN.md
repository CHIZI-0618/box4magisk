# Box4Magisk WebUI 设计草案

## 目标

为 `box4magisk` 提供一个适合 KernelSU WebUI 的配置页面，不额外引入常驻 REST 服务。

推荐链路：

`WebUI -> kernelsu.exec() -> /data/adb/box/scripts/box.webui -> box.config / box.service`

这样做的优点：

- 不需要新开本地 HTTP 端口
- 沿用 KernelSU 自带 bridge 权限模型
- 适合配置类页面和服务控制页面
- 后续如果要兼容 Magisk WebUI，也可以复用这层命令接口

## 页面结构

建议首页采用卡片式入口，而不是把所有配置堆在一个长表单里。

### 1. 总览页

展示：

- 当前核心：`bin_name`
- 当前服务状态：运行中 / 已停止
- 当前代理模式：`PROXY_MODE`
- App 分流状态：启用 / 未启用
- Mihomo 面板入口

操作：

- 启动服务
- 停止服务
- 重启服务
- 打开 Mihomo 面板

### 2. 基础开关页

适合用按钮、开关和分组卡片。

建议放这些项：

- `PROXY_MODE`
- `PROXY_MOBILE`
- `PROXY_WIFI`
- `PROXY_HOTSPOT`
- `PROXY_USB`
- `PROXY_TCP`
- `PROXY_UDP`
- `PROXY_IPV6`
- `BYPASS_CN_IP`
- `BLOCK_QUIC`

交互建议：

- 布尔项使用开关按钮
- 枚举项使用分段按钮
- 保存后可提示用户是否立即 `restart`

### 3. 应用分流页

这里是你说的 app 白名单等配置入口。

建议拆成 3 块：

- 启用按应用代理：`APP_PROXY_ENABLE`
- 模式切换：`APP_PROXY_MODE=whitelist|blacklist`
- 应用列表编辑：`PROXY_APPS_LIST` / `BYPASS_APPS_LIST`

如果前端运行在 KernelSU WebUI 环境里，可以直接调用 `listPackages()` 读取应用列表，让用户点击选择应用，而不是手输包名。

推荐交互：

- 上方切换黑名单 / 白名单
- 中间是已选应用列表
- 下方是系统应用 / 用户应用搜索选择器

### 4. Mihomo 面板页

这个页面本身不需要重做 Yacd。

只需要做：

- 显示 `clash_api_port`
- 显示 `clash_api_secret`
- 显示推荐地址
- 一个“打开 MetaCubeX 面板”按钮

推荐按钮逻辑：

- 默认跳 `https://yacd.metacubex.one`
- 同时提供 bridge 返回的预填参数地址
- 如果用户在本机环境中打开失败，再提示手动填 `127.0.0.1:9090` 与 `secret`

## Bridge 设计

新增脚本：

- [`box/scripts/box.webui`](/disk/code/python/box4magisk/box/scripts/box.webui)

这层只做两件事：

1. 把模块脚本能力包装成 JSON
2. 给前端提供稳定命令接口

### 推荐命令

#### `status`

用于首页总览。

返回：

- 服务是否运行
- PID
- 当前核心
- 当前代理模式
- App 分流状态
- Mihomo API 端口和 secret

#### `get-config`

用于页面初始化。

返回常用配置项，例如：

- `PROXY_MODE`
- `PROXY_WIFI`
- `APP_PROXY_ENABLE`
- `APP_PROXY_MODE`
- `PROXY_APPS_LIST`
- `BYPASS_APPS_LIST`

#### `set-config KEY VALUE`

用于普通字符串配置写入。

适合：

- `PROXY_MODE`
- `APP_PROXY_MODE`
- `clash_api_secret`

#### `toggle KEY 0|1`

用于按钮型布尔配置。

适合：

- `PROXY_WIFI`
- `PROXY_MOBILE`
- `APP_PROXY_ENABLE`
- `BYPASS_CN_IP`

建议这类命令在写入前做能力校验。

例如：

- 开启 `BYPASS_CN_IP=1` 前先检查 `ipset` 命令是否存在
- 同时检查内核是否启用 `CONFIG_IP_SET` 与 `CONFIG_NETFILTER_XT_SET`
- 开启 `PROXY_IPV6=1` 且当前 `PROXY_MODE=REDIRECT` 时，先检查 `CONFIG_IP6_NF_NAT` 与 `CONFIG_IP6_NF_TARGET_REDIRECT`

#### `service start|stop|restart|status`

直接桥接到 `box.service`。

#### `apps`

返回按应用代理相关状态。

#### `set-apps whitelist|blacklist|disable [LIST]`

方便应用分流页直接提交。

#### `mihomo-panel-url [HOST] [PORT] [SECRET] [http|https]`

用于生成 Mihomo 面板入口信息。

#### `capabilities`

用于前端初始化能力探测。

推荐前端启动时先调用一次，然后决定哪些开关可以点。

建议至少返回：

- `ipset` 命令是否存在
- `/proc/config.gz` 是否可读
- 内核是否支持 TPROXY
- 内核是否支持 `IP_SET`
- 内核是否支持 `NETFILTER_XT_SET`
- 内核是否支持 `IP6_NF_NAT`
- 内核是否支持 `IP6_NF_TARGET_REDIRECT`
- 各功能的可用性和原因字符串

前端可据此做：

- `BYPASS_CN_IP` 不可用时禁用开关，并显示原因
- `PROXY_MODE=TPROXY` 不支持时，不显示或禁用该选项
- `PROXY_IPV6` 在 `REDIRECT` 模式下缺少 IPv6 NAT/REDIRECT 支持时，显示警告

## 前端 Bridge 写法

如果参考 `Duck-ToolBox`，前端可以单独做一个 `bridge.ts`。

伪代码：

```ts
import { exec } from "kernelsu"

const bridgePath = "/data/adb/box/scripts/box.webui"

async function run(args: string[]) {
  const command = `${bridgePath} ${args.map(shellQuote).join(" ")}`
  const result = await exec(command)
  const text = `${result.stdout ?? ""}\n${result.stderr ?? ""}`.trim()
  return JSON.parse(text)
}

export const boxBridge = {
  status: () => run(["status"]),
  capabilities: () => run(["capabilities"]),
  getConfig: () => run(["get-config"]),
  toggle: (key: string, value: 0 | 1) => run(["toggle", key, String(value)]),
  setConfig: (key: string, value: string) => run(["set-config", key, value]),
  service: (action: "start" | "stop" | "restart" | "status") => run(["service", action]),
  apps: () => run(["apps"]),
  setApps: (mode: "whitelist" | "blacklist" | "disable", value = "") =>
    run(["set-apps", mode, value]),
  mihomoPanelUrl: () => run(["mihomo-panel-url"]),
}
```

## 前端状态联动建议

### `BYPASS_CN_IP`

页面初始化时：

1. 调 `capabilities`
2. 读取 `features.BYPASS_CN_IP.available`
3. 如果为 `false`，禁用开关并展示 `reason`

交互文案建议：

- `当前内核不支持 ipset，无法启用大陆 IP 绕过`
- `设备缺少 ipset 命令，无法启用大陆 IP 绕过`

### `PROXY_MODE`

如果 `features.TPROXY.available=false`：

- 不要默认选 `TPROXY`
- `auto` 旁边可提示“当前设备会退回 REDIRECT”
- `TPROXY` 选项可直接禁用

### `PROXY_IPV6`

如果当前是 `REDIRECT` 模式且 `features.IPV6_REDIRECT.available=false`：

- 开关旁显示警告
- 或者阻止开启并给出明确原因

## 是否要做后端 REST 服务

当前阶段不建议。

只有在这些场景下才建议补一个本地 HTTP API：

- 你要做实时日志流
- 你要做高频状态轮询
- 你要脱离 KernelSU WebView 单独访问
- 你要把 UI 暴露给其他设备浏览器访问

否则 `exec + shell + JSON` 已经够用，而且更稳。

## UI 风格建议

参考 `Duck-ToolBox` 可以学结构，不建议直接照搬视觉。

更适合 `box4magisk` 的方向：

- 首页采用“状态卡片 + 快捷入口”
- 开关项采用双列卡片或列表卡片
- 危险操作例如“停止服务”做成次级按钮
- 应用分流页重点做搜索、筛选、已选标签展示
- Mihomo 面板入口做成醒目的外链卡片

## 下一步建议

按实现顺序建议这样做：

1. 先把 `box.webui` 固定下来
2. 再写 WebUI 的 `bridge.ts`
3. 先做总览页和基础开关页
4. 再做应用分流页
5. 最后补 Mihomo 面板入口页

这样可以最快拿到一个可用版本。
