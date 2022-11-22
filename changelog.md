### box4magisk 更新日志

#### v3.7
- 添加自定义用户用户组启动 Box 服务
- 添加默认代理 USB 网络共享
- 启动服务时默认删除三天前日志

#### v3.6
- 添加 IPv6 支持
- 优化 box.config 配置定义

#### v3.5
- 修复 TUN 设备检查
- 修复模块安装脚本

#### v3.4
- 支持 Magisk 模块在线更新
- 修复 shell 解释器兼容
- 修复模块安装脚本

#### v3.3
- 修复非 TUN 模式的启动
- 优化服务启动脚本

#### v3.2
- 修复 TUN 模式的热点代理

#### v3.1
- 修复 DNS 拦截错误

#### v3.0
- 支持透明代理黑白名单
- 支持仅启动核心模式（用来支持 TUN）
- 支持 REDIRECT 透明代理（可与 TUN 共用）
- 添加 TPROXY 兼容性检查
- 修复内核状态与权限检查
- 修复局域网 DNS 拦截
- 添加 Magisk Lite 版本适配
- 添加 README.md，更新配置示例
- 添加模块构建脚本并使用 GitHub Action 自动发布版本

#### v2.0
- 初始版本
- 支持 sing-box，clash，xray，v2fly 的 TPROXY 透明代理
- 添加 sing-box，clash 透明代理配置示例
- 支持指定是否代理 WiFi 或热点
- 默认禁用 IPv6
- 默认开机启动，Magisk Manager 管理服务启停
- ~~可选 yq 修改用户配置~~
