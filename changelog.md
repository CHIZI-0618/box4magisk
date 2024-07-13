## box4magisk 更新日志

### v4.9
- 添加 APatch 支持(实验性)
- 添加 Hysteria 核心支持
- 添加 mihomo 独立于 clash 支持
- 修复透明代理开机无网络
- 修复部分核心 Tun 模式下的热点分享
- 撤销本机公网透明代理防回环

### v4.8
- 修复 APP 不存在时 UID 计算错误
- 修复 fakeip ICMP
- 修复进程/包名嗅探
- 修复本机公网透明代理回环

### v4.7
- 修复 APP 黑白名单匹配与 UID 计算
- 修复 v2fly/xray 核心 geo* 文件位置错误
- 修复 Clash.Meta 配置中的拼写错误
- 支持 GID 黑白名单

### v4.6
- 修复白名单未生效的错误
- 修复 Magisk 控制启停时黑白名单未获取的错误
- 更新部分核心示例配置
  - 修复 Clash.Meta 配置中的拼写错误
  - sing-box 使用 any 出站规则匹配出站服务器域名解析

### v4.5
- 添加 Box 核心 CPU 使用率显示
- 添加 KernelSU 安装支持
- 更新部分核心示例配置
  - Clash.Meta 的 DNS / 策略组配置
  - sing-box 的 fakedns / Proxy Providers 配置

### v4.4
- 修复因包名重复导致的 UID 错误
- 修复白名单 clash DNS 流量重定向
- 添加 xray 透明代理配置示例
- 移除路由表禁用 IPv6
- 优化 Box 服务启动脚本
  - 添加 Box 内核内存占用显示
  - 添加 Box 内核运行时间显示
  - 添加 Magisk Busybox 至 PATH
  - 增强 Box 服务存活检查

### v4.3
- 修复黑白名单打印错误
- 添加部分日志输出

### v4.2
- 修复初次安装环境缺失无法启动的错误
- 添加初次安装免重启可使用 Magisk Manager 启停控制
- 优化 libcap 使用时机
  - 增强 Box 用户用户组合法性检查
  - 添加 libcap 使用前判断

### v4.1
- 修复日志打印，重定向输出时不再输出颜色
- 修复透明代理前 Box 服务检查
- 修复 Magisk Manager 启停控制
- 添加通过路由表禁用 IPv6
- 添加启用/禁用 IPv6 命令参数
- 添加白名单默认透明代理 DNS

### v4.0
- 支持启动时检测本地 IP 并绕过透明代理
- 修复日志打印错误
- 修复 Box 用户检查
- 添加日志颜色输出

### v3.9
- 支持安卓多用户黑白名单
- 移除默认 libcap 安装
- 优化安装脚本
  - 备份用户 Box 服务配置
  - 增量更新用户 Box 服务配置

### v3.8
- 修复自定义用户用户组获取
- 修复 Magisk Manager 无法禁用透明代理的错误

### v3.7
- 支持自定义用户用户组启动 Box 服务
- 支持可选代理 USB 网络共享
- 修复 clash DNS 拦截
- 默认删除三天前日志

### v3.6
- 支持 IPv6 tproxy 透明代理
- 修复 Magisk Manager 更新日志显示错误
- 优化 box.config 配置定义
  - `network_mode` 改为 `proxy_method`

### v3.5
- 修复 TUN 设备检查
- 修复模块安装脚本

### v3.4
- 支持 Magisk 模块在线更新
- 修复 shell 解释器兼容
- 修复模块安装脚本

### v3.3
- 修复非 TUN 模式的启动
- 优化 Box 服务启动脚本
  - if 改为 case

### v3.2
- 修复 TUN 模式的热点代理

### v3.1
- 修复 DNS 拦截错误

### v3.0
- 支持透明代理黑白名单
- 支持仅启动核心模式（用来支持 TUN）
- 支持 REDIRECT 透明代理（可与 TUN 共用即混合模式代理）
- 修复内核状态与权限检查
- 修复局域网 DNS 拦截
- 添加 TPROXY 兼容性检查
- 添加 clash 内核日志
- 添加 Magisk Lite 版本适配
- 添加 README.md
- 添加模块构建脚本并使用 GitHub Action 自动发布版本
- 更新防回环规则
- 更新配置示例

### v2.0
- 支持开机启动，Magisk Manager 管理服务启停
- ~~支持 yq 修改用户配置~~
- 支持 sing-box，clash，xray，v2fly 的 TPROXY 透明代理
- 支持可选代理 WiFi 或热点
- 添加 sing-box，clash 透明代理配置示例
- 默认禁用 IPv6
- 初始版本