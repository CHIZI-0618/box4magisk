# Box4Magisk / KernelSU / APatch

[English](README.md) | [中文](README_zh.md)

本项目是一个 Magisk / KernelSU / APatch 模块，用于在 Android 设备上部署多种代理核心，包括 **clash**、**mihomo**、**sing-box**、**v2ray**、**xray** 和 **hysteria**。

支持的透明代理模式：
- **REDIRECT**：仅 TCP
- **TPROXY**：TCP + UDP（默认优先）
- **TUN**：TCP + UDP（由核心提供，仅 sing-box、clash、mihomo 支持）
- **混合模式**：REDIRECT (TCP) + TUN (UDP)

## 免责声明

本项目不对设备变砖、数据损坏或其他硬件/软件问题负责。

**重要警告**：请确保您的配置文件不会导致流量回环，否则可能引起设备无限重启！

如果您不熟悉代理配置，建议先使用用户友好的应用（如 ClashForAndroid、sing-box for Android、v2rayNG、SagerNet 等）学习基本概念。

## 安装

1. 从 [Releases](https://github.com/CHIZI-0618/box4magisk/releases) 下载最新模块 ZIP 包。
2. 在 Magisk Manager、KernelSU Manager 或 APatch Manager 中安装。
3. 支持在线更新（更新后无需重启即可生效）。
4. 更新模块时会自动备份用户配置，并合并到新版本的 `/data/adb/box/scripts/box.config`（建议更新后检查并清理重复/废弃字段）。

**注意**：模块不包含任何代理核心二进制文件。

安装完成后，请手动下载对应设备架构的核心可执行文件，放置到 `/data/adb/box/bin/` 目录。

## 配置

### 选择代理核心

核心工作目录：`/data/adb/box/<核心名字>`  
核心由 `/data/adb/box/scripts/box.config` 中的 `bin_name` 决定，可选值：

- `sing-box`（推荐，默认）
- `clash`
- `mihomo`
- `xray`
- `v2ray`
- `hysteria`

**提示**：`mihomo` 和 `sing-box` 自带默认配置文件，已预设好与透明代理配合。建议直接编辑 `proxy-providers` 或 `outbounds` 部分添加您的节点。  
进阶配置请参考官方文档：
- [Clash](https://github.com/Dreamacro/clash/wiki/configuration)
- [Mihomo](https://wiki.metacubex.one)
- [sing-box](https://sing-box.sagernet.org/)
- [V2Ray](https://www.v2fly.org/)
- [Xray](https://xtls.github.io/)
- [Hysteria](https://v2.hysteria.network/)

模块会自动检查配置文件合法性，结果保存在 `/data/adb/box/run/check.log`。

### box.config 主要配置项说明

以下是 `/data/adb/box/scripts/box.config` 的关键选项。这些选项支持灵活组合，例如您可以选择仅代理移动数据和 WiFi，而不代理热点和 USB 共享。网络接口代理支持任意组合搭配（如仅代理 WiFi + 热点，或仅代理移动数据 + USB），但必须正确配置对应的 `*_INTERFACE` 变量（例如 `MOBILE_INTERFACE="rmnet_data+"`、`WIFI_INTERFACE="wlan0"`、`HOTSPOT_INTERFACE="wlan2"`、`USB_INTERFACE="rndis+"`），以匹配设备实际接口名（可用 `ifconfig` 或 `ip link` 检查）。

| 配置项                  | 默认值          | 说明 |
|-------------------------|-----------------|------|
| `bin_name`             | `sing-box`     | 选择启用的代理核心（决定模块行为） |
| `CORE_USER_GROUP`      | `root:net_admin` | 核心运行的用户组（高级用户可修改为自定义 UID:GID，需要 setcap 支持） |
| `PROXY_TCP_PORT` / `PROXY_UDP_PORT` | `1536` | 透明代理监听端口 |
| `PROXY_MODE`           | `auto`         | 代理模式：`auto`（优先 TPROXY）、`TPROXY`、`REDIRECT`、`core`（仅启动核心，支持原生 TUN） |
| `DNS_HIJACK_ENABLE`    | `1`            | DNS 劫持（0=禁用，1=启用 TPROXY，2=启用 REDIRECT，非必要无需改动） |
| `DNS_PORT`             | `1053`         | DNS 监听端口 |
| `MOBILE_INTERFACE`     | `rmnet_data+`  | 移动数据接口名 |
| `WIFI_INTERFACE`       | `wlan0`        | WiFi 接口名 |
| `HOTSPOT_INTERFACE`    | `wlan2`        | 热点接口名 |
| `USB_INTERFACE`        | `rndis+`       | USB 共享接口名 |
| `PROXY_MOBILE`         | `1`            | 是否代理移动数据流量（1=代理，0=不代理；支持与其他接口任意组合） |
| `PROXY_WIFI`           | `1`            | 是否代理 WiFi 流量（1=代理，0=不代理；支持与其他接口任意组合） |
| `PROXY_HOTSPOT`        | `0`            | 是否代理热点流量（1=代理，0=不代理；支持与其他接口任意组合；启用时 MAC 过滤生效） |
| `PROXY_USB`            | `0`            | 是否代理 USB 共享流量（1=代理，0=不代理；支持与其他接口任意组合） |
| `PROXY_TCP` / `PROXY_UDP` | `1` / `1` | 是否代理 TCP/UDP（1=代理，0=不代理） |
| `PROXY_IPV6`           | `0`            | 是否代理 IPv6（1=代理，0=禁用；在 REDIRECT 模式下，模块会自动检查内核对 `IP6_NF_NAT` 和 `IP6_NF_TARGET_REDIRECT` 的支持，若不支持则 IPv6 代理将失效） |
| `APP_PROXY_ENABLE`     | `0`            | 启用按应用代理（1=启用） |
| `APP_PROXY_MODE`       | `blacklist`    | `blacklist`（绕过指定应用）或 `whitelist`（仅代理指定应用） |
| `BYPASS_APPS_LIST` / `PROXY_APPS_LIST` | 空 | 应用列表，格式：`"用户ID:包名"`（多条用空格分隔，例如 `"0:com.android.systemui" "10:com.tencent.mm"`） |
| `GID_PROXY_ENABLE`     | `0`            | 启用按进程 GID 代理（高级） |
| `GID_PROXY_MODE`       | `blacklist`    | `blacklist`（绕过指定 GID）或 `whitelist`（仅代理指定 GID） |
| `BYPASS_GIDS_LIST` / `PROXY_GIDS_LIST` | 空 | GID 列表（多条用空格分隔） |
| `BYPASS_CN_IP`         | `0`            | 是否绕过中国大陆 IP（1=启用，0=禁用；需要内核支持 `ipset`，模块会自动检查支持情况，若不支持则功能失效；启用后会从指定 URL 下载 IP 列表） |
| `MAC_FILTER_ENABLE`    | `0`            | 启用 MAC 地址过滤（1=启用，0=禁用；仅在热点模式 `PROXY_HOTSPOT=1` 下生效） |
| `MAC_PROXY_MODE`       | `blacklist`    | `blacklist`（绕过指定 MAC）或 `whitelist`（仅代理指定 MAC） |
| `BYPASS_MACS_LIST` / `PROXY_MACS_LIST` | 空 | MAC 地址列表（多条用空格分隔，例如 `"AA:BB:CC:DD:EE:FF" "11:22:33:44:55:66"`） |

## 使用方法

### 常规使用（推荐）

- 服务默认开机自启。
- 通过 Magisk / KernelSU / APatch Manager **启用/禁用模块** 即可实时启停服务（无需重启设备）。

#### 按应用代理（分流）

启用 `APP_PROXY_ENABLE=1` 后：
- **黑名单模式**（默认）：代理所有应用，除指定列表（用 `BYPASS_APPS_LIST`）。
- **白名单模式**：仅代理指定列表（用 `PROXY_APPS_LIST`，设置 `APP_PROXY_MODE=whitelist`）。

#### 仅使用核心原生 TUN（不透明代理）

设置 `PROXY_MODE=core`，透明代理规则将不加载，仅启动核心（适用于 sing-box/clash/mihomo 的 TUN 入站）。

### 高级用法

- **强制 REDIRECT 模式**：`PROXY_MODE=REDIRECT`（UDP 不代理，除非核心启用 TUN）。
- **代理热点**：`PROXY_HOTSPOT=1`（需正确设置 `HOTSPOT_INTERFACE`；此时 MAC 过滤生效，可用于控制热点连接设备的代理）。
- **按进程 GID 分流**：启用 `GID_PROXY_ENABLE=1`，使用 `PROXY_GIDS_LIST` 或 `BYPASS_GIDS_LIST`。

### 手动模式

创建空文件 `/data/adb/box/manual` 后：
- 服务不再开机自启，也无法通过 Manager 控制。
- 手动命令：
  - 服务：`/data/adb/box/scripts/box.service start|stop|restart|status`
  - 透明代理：`/data/adb/box/scripts/box.tproxy start|stop|restart`

## 其他说明

- 修改核心配置文件后，请确保与 `box.config` 中的端口等设置一致。
- 模块会自动防回环（绕过本地 IP 并利用 NETFILTER_XT_MATCH_ADDRTYPE 特性），但若设备有公网 IP，仍建议手动添加[绕过规则](box/scripts/box.tproxy#L567-L585)。
- 日志位于 `/data/adb/box/run/` 目录。

## 卸载

- 从 Magisk Manager，KernelSU Manager 或 APatch 应用卸载本模块，会删除 `/data/adb/service.d/box4_service.sh` 文件，保留 Box 数据目录 `/data/adb/box`
- 可使用命令清除 Box 数据：`rm -rf /data/adb/box`

## 更新日志

[CHANGELOG](changelog.md)


## 项目 Star 数增长趋势图

[![Stargazers over time](https://starchart.cc/CHIZI-0618/box4magisk.svg)](https://starchart.cc/CHIZI-0618/box4magisk)