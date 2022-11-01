# Box4Magisk

本项目为 clash、sing-box、v2ray、xray 的透明代理 Magisk 模块。

## 免责声明

本项目不对以下情况负责：设备变砖、SD 卡损坏或 SoC 烧毁。

**请确保您的配置文件不会造成流量回环，否则可能会导致您的手机无限重启。**

如果你真的不知道如何配置这个模块，你可能需要像 ClashForAndroid、v2rayNG、SagerNet（或 AnXray）等应用程序。

## 安装

从 [Release](https://github.com/CHIZI-0618/box4magisk/releases) 下载模块压缩包，然后通过 [Magisk](https://github.com/topjohnwu/Magisk) 安装。

### 注意

模块不包含 [clash](https://github.com/MetaCubeX/Clash.Meta)、[sing-box](https://github.com/SagerNet/sing-box)、[v2ray-core](https://github.com/v2fly/v2ray-core)、[Xray-core](https://github.com/XTLS/Xray-core) 等二进制文件。
  
模块安装完成后请下载对应架构的核心文件放置到 `/data/adb/box/bin/` 目录。

## 配置

- 各核心工作在 `/data/adb/box/核心名字` 目录，核心名字由 `/data/adb/box/scripts/box.config` 文件中 `bin_name` 定义，有效值只有 `clash`、`xray`、`v2ray`、`sing-box`，`bin_name` 决定启用的核心
- 各核心配置文件需用户自定义，脚本会检查配置合法性, 检查结果存储在 `/data/adb/box/run/check.log` 文件中
- 提示：`clash` 和 `sing-box` 自带默认配置已做好配合透明代理脚本工作的准备。建议只编辑 `proxy provider` 或 `outbounds` 部分来添加您的代理服务器，进阶配置请参考相应官方文档。地址：[clash 文档](https://github.com/Dreamacro/clash/wiki/configuration)，[sing-box 文档](https://sing-box.sagernet.org/)，[v2ray 文档](https://www.v2fly.org/)，[xray 文档](https://xtls.github.io/)

## 使用方法

### 常规方法（默认 & 推荐方法）

#### 管理服务的启停

**以下核心服务统称 Box**

- Box 服务默认会在系统启动后自动运行。
- 您可以通过 Magisk 管理应用打开或关闭模块实时启动或停止 Box 服务，不需要重启您的设备。启动服务可能需要等待几秒钟，停止服务可能会立即生效。

#### 选择需要代理的应用程序（APP）

- Box 默认代理所有安卓用户的所有应用程序（APP）

- 如果您希望 box 代理所有应用程序（APP），除了某些特定的应用，那么请打开 `/data/adb/box/scripts/box.config` 文件，修改 `mode` 的值为 `blacklist`（默认值），在 `packages_list=()` 数组中添加元素，即括号内添加**不希望**代理的应用包名，各应用包名用空格隔开。

- 如果您希望对特定的应用程序（APP）进行透明代理，那么请打开 `/data/adb/box/scripts/box.config` 文件，修改 `mode` 的值为 `whitelist`，在 `packages_list=()` 数组中添加元素，即括号内添加**希望**代理的应用包名，各应用包名用空格隔开。

- `mode` 的值为 `core` 时，透明代理不会工作，仅仅启动相应内核，这可以用来支持部分内核原生的 tun 入站。


### 高级用法

#### 进入手动模式

如果您希望完全通过运行命令来控制 Box，只需新建一个文件 `/data/adb/box/manual`。在这种情况下，Box 服务不会在启动时自动启动，您也不能通过 Magisk 管理器应用管理服务的启动或停止。

#### 管理服务的启停

- Box service 脚本是 `/data/adb/box/scripts/box.service`.

- 例如，在测试环境中（Magisk-alpha version: 23001）

  - 启动服务 :

    `/data/adb/box/scripts/box.service start`

  - 停止服务 :

    `/data/adb/box/scripts/box.service stop`

#### 管理透明代理是否启用

- 透明代理脚本是 `/data/adb/box/scripts/box.tproxy`.

- 例如，在测试环境中（Magisk-alpha version: 23001）

  - 启用透明代理：

    `/data/adb/box/scripts/box.tproxy enable`

  - 停用透明代理：

    `/data/adb/box/scripts/box.tproxy disable`

#### 连接到 WLAN 或开热点时绕过透明代理

- Box 默认透明代理本机与热点

- 打开 `/data/adb/box/scripts/box.config` 文件，修改 `ignore_out_list` 数组添加 `wlan+` 元素则透明代理绕过 WLAN，热点不受影响

- 打开 `/data/adb/box/scripts/box.config` 文件，修改 `ap_list` 数组删除 `wlan+` 元素则不透明代理 WLAN 与热点(联发科机型可能为 `ap+` 而非 `wlan+`)


## 卸载

1. 从 Magisk 管理器应用卸载本模块，会删除 `/data/adb/service.d/box4magisk_service.sh`，保留 Box 数据目录 `/data/adb/box`。
2. 使用命令清除 Box 数据：`rm -rf /data/adb/box`
