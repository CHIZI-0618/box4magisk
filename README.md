# Box4Magisk

本分支为 clash、sing-box、v2ray、xray 的 [KernelSU](https://github.com/tiann/KernelSU) 模块测试版本。支持 REDIRECT（仅 TCP）、TPROXY（TCP + UDP）透明代理，支持 TUN（TCP + UDP），亦可 REDIRECT（TCP） + TUN（UDP） 混合模式代理。

## 免责声明

由于 KernelSU 正在快速开发测试中，本分支不保证后续兼容性。
本分支不对以下情况负责：设备变砖、SD 卡损坏或 SoC 烧毁。

**请确保您的配置文件不会造成流量回环，否则可能会导致您的手机无限重启。**

如果你真的不知道如何配置这个模块，你可能需要像 ClashForAndroid、v2rayNG、surfboard、SagerNet、AnXray 等应用程序。


## 安装

- 从 [Release](https://github.com/CHIZI-0618/box4magisk/releases) 下载带有 KSU 关键字的模块压缩包，然后通过 KernelSU Manager 安装
- 更新模块时会备份用户配置，且附加用户配置至新 `/data/adb/ksu/box/scripts/box.config` 文件（在 shell 中，后定义的变量值会覆盖之前的定义值，但仍建议更新模块后再次编辑 `box.config` 文件去除重复定义与移除废弃字段）

### 注意

模块不包含 [clash](https://github.com/Dreamacro/clash)、[clash.meta](https://github.com/MetaCubeX/Clash.Meta)、[sing-box](https://github.com/SagerNet/sing-box)、[v2ray-core](https://github.com/v2fly/v2ray-core)、[Xray-core](https://github.com/XTLS/Xray-core) 等二进制文件。
  
模块安装完成后请下载您设备对应架构的核心文件放置到 `/data/adb/ksu/box/bin/` 目录。


## 配置

- 各核心工作在 `/data/adb/ksu/box/核心名字` 目录，核心名字由 `/data/adb/ksu/box/scripts/box.config` 文件中 `bin_name` 定义，有效值只有 `clash`、`xray`、`v2ray`、`sing-box`，`bin_name` **决定模块启用的核心**
- 各核心配置文件需用户自定义，脚本会检查配置合法性，检查结果存储在 `/data/adb/ksu/box/run/check.log` 文件中
- 提示：`clash` 和 `sing-box` 自带默认配置已做好配合透明代理脚本工作的准备。建议编辑 `proxy-providers` 或 `outbounds` 部分来添加您的代理服务器，进阶配置请参考相应官方文档。地址：[clash 文档](https://github.com/Dreamacro/clash/wiki/configuration)，[sing-box 文档](https://sing-box.sagernet.org/)，[v2ray 文档](https://www.v2fly.org/)，[xray 文档](https://xtls.github.io/)


## 使用方法

### 常规方法（默认 & 推荐方法）

#### 管理服务的启停

**以下核心服务统称 Box**

- Box 服务默认会在系统启动后自动运行
- 您可以通过 KernelSU Manager 应用打开或关闭模块**实时**启动或停止 Box 服务，**不需要重启您的设备**。启动服务可能需要等待几秒钟，停止服务可能会立即生效

#### 选择需要代理的应用程序（APP）

- Box 默认代理所有安卓用户的所有应用程序（APP）

- 如果您希望 Box 代理所有应用程序（APP），除了某些特定的应用，那么请打开 `/data/adb/ksu/box/scripts/box.config` 文件，修改 `proxy_mode` 的值为 `blacklist`（默认值），在 `user_packages_list` 数组中添加元素，数组元素格式为`安卓用户:应用包名`，元素之间用空格隔开。即可**不代理**相应安卓用户应用。例如 `user_packages_list=("0:com.android.captiveportallogin" "10:com.tencent.mm")` 代表不代理用户 0 的 CaptivePortalLogin 和用户 10 的 Wechat

- 如果您希望只对特定的应用程序（APP）进行透明代理，那么请打开 `/data/adb/ksu/box/scripts/box.config` 文件，修改 `proxy_mode` 的值为 `whitelist`，在 `user_packages_list` 数组中添加元素，数组元素格式为`安卓用户:应用包名`，元素之间用空格隔开。即可**代理**相应安卓用户应用。例如 `user_packages_list=("0:com.termux" "10:org.telegram.messenger")` 代表代理用户 0 的 Termux 和用户 10 的 Telegram

- `proxy_mode` 的值为 `core` 时，透明代理不会工作，仅仅启动相应内核，这可以用来支持部分内核原生的 TUN 入站

### 高级用法

#### 更改代理模式

- Box 默认使用 TPROXY 透明代理 TCP + UDP，若检测到设备不支持 TPROXY，则自动使用 REDIRECT 仅代理 TCP

- 打开 `/data/adb/ksu/box/scripts/box.config` 文件，修改 `proxy_method` 的值为 `REDIRECT` 或 `MIXED` 则使用 REDIRECT 代理 TCP，在 Box 内核（仅 sing-box、clash 支持 TUN）没有启用 TUN 时 UDP 不会被代理

#### 更改启动 Box 服务的用户

- Box 默认使用 `root:net_admin` 用户用户组启动

- 打开 `/data/adb/ksu/box/scripts/box.config` 文件，修改 `box_user_group` 的值为设备中已存在的 `UID:GID`，此时 Box 内核必须在 `/system/bin/` 目录中（可以使用 Magisk），且需要 `setcap` 二进制，它被包含在 [libcap](https://android.googlesource.com/platform/external/libcap/) 中

#### 连接到 WLAN 或开热点时绕过透明代理

- Box 默认透明代理本机与热点（包括 USB 网络共享）

- 打开 `/data/adb/ksu/box/scripts/box.config` 文件，修改 `ignore_out_list` 数组添加 `wlan+` 元素则透明代理绕过 WLAN，热点不受影响

- 打开 `/data/adb/ksu/box/scripts/box.config` 文件，修改 `ap_list` 数组删除 `wlan+` 元素则不透明代理热点（联发科机型可能为 `ap+` 而非 `wlan+`）

#### 进入手动模式

如果您希望完全通过运行命令来控制 Box，只需新建一个文件 `/data/adb/ksu/box/manual`。在这种情况下，Box 服务不会在您的设备启动时**自动启动**，您也不能通过 KernelSU Manager 应用管理服务的启动或停止。

##### 管理服务的启停

- Box 服务脚本是 `/data/adb/ksu/box/scripts/box.service`

- 例如，在测试环境中（KernelSU version: 10591）

  - 启动服务：

    `/data/adb/ksu/box/scripts/box.service start`

  - 停止服务：

    `/data/adb/ksu/box/scripts/box.service stop`

  - 重启服务：

    `/data/adb/ksu/box/scripts/box.service restart`

  - 显示状态：

    `/data/adb/ksu/box/scripts/box.service status`
  
##### 管理透明代理是否启用

- 透明代理脚本是 `/data/adb/ksu/box/scripts/box.tproxy`

- 例如，在测试环境中（KernelSU version: 10591）

  - 启用透明代理：

    `/data/adb/ksu/box/scripts/box.tproxy enable`

  - 停用透明代理：

    `/data/adb/ksu/box/scripts/box.tproxy disable`

  - 重载透明代理：

    `/data/adb/ksu/box/scripts/box.tproxy renew`
  
## 其他说明

- 修改各核心配置文件时请保证 `tprxoy` 相关的配置与 `/data/adb/ksu/box/scripts/box.config` 文件中的定义一致
  
- ~~Box 服务可使用 [yq](https://github.com/mikefarah/yq) [修改用户配置](box/scripts/box.service#L11-L15)~~

- 如本机存在**公网 IP** 地址请将 IP 添加至 `/data/adb/ksu/box/scripts/box.config` 文件中的 `intranet` 数组中，防止流量环路

- Box 服务的日志在 `/data/adb/ksu/box/run` 目录


## 卸载

- 从 KernelSU Manager 应用卸载本模块，会删除 `/data/adb/ksu/service.d/box4KSU_service.sh`，保留 Box 数据目录 `/data/adb/ksu/box`
- 可使用命令清除 Box 数据：`rm -rf /data/adb/ksu/box`

## 更新日志

[CHANGELOG](changelog.md)


## 项目 Star 数增长趋势图

[![Stargazers over time](https://starchart.cc/CHIZI-0618/box4magisk.svg)](https://starchart.cc/CHIZI-0618/box4magisk)
