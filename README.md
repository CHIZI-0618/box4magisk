# Box4Magisk / KernelSU / APatch

[English](README.md) | [中文](README_zh.md)

This project is a Magisk / KernelSU / APatch module used to deploy multiple proxy cores on Android devices, including **clash**, **mihomo**, **sing-box**, **v2ray**, **xray**, and **hysteria**.

Supported transparent proxy modes:
- **REDIRECT**: TCP only
- **TPROXY**: TCP + UDP (default and preferred)
- **TUN**: TCP + UDP (provided by the core; supported only by sing-box, clash, and mihomo)
- **Mixed mode**: REDIRECT (TCP) + TUN (UDP)

## Disclaimer

This project assumes no responsibility for device bricking, data corruption, or any other hardware or software issues.

**Important warning**: Please ensure that your configuration does not cause traffic looping, otherwise it may result in infinite reboot of the device.

If you are not familiar with proxy configuration, it is recommended to first learn the basic concepts using user-friendly applications such as ClashForAndroid, sing-box for Android, v2rayNG, SagerNet, etc.

## Installation

1. Download the latest module ZIP package from [Releases](https://github.com/CHIZI-0618/box4magisk/releases).
2. Install it via Magisk Manager, KernelSU Manager, or APatch Manager.
3. Online updates are supported (effective immediately after update, no reboot required).
4. When updating the module, user configurations will be automatically backed up and merged into the new `/data/adb/box/scripts/box.config` (it is recommended to review and clean up duplicated or deprecated fields after updating).

**Note**: The module does not include any proxy core binary files.

After installation, please manually download the core executable corresponding to your device architecture and place it into the `/data/adb/box/bin/` directory.

## Configuration

### Selecting a Proxy Core

Core working directory: `/data/adb/box/<core name>`  
The core is determined by `bin_name` in `/data/adb/box/scripts/box.config`. Available values:

- `sing-box` (recommended, default)
- `clash`
- `mihomo`
- `xray`
- `v2ray`
- `hysteria`

**Tip**: `mihomo` and `sing-box` include default configuration files that are preconfigured to work with transparent proxying. It is recommended to directly edit the `proxy-providers` or `outbounds` sections to add your nodes.  
For advanced configuration, please refer to the official documentation:
- [Clash](https://github.com/Dreamacro/clash/wiki/configuration)
- [Mihomo](https://wiki.metacubex.one)
- [sing-box](https://sing-box.sagernet.org/)
- [V2Ray](https://www.v2fly.org/)
- [Xray](https://xtls.github.io/)
- [Hysteria](https://v2.hysteria.network/)

The module automatically checks the validity of configuration files. Results are saved to `/data/adb/box/run/check.log`.

### Explanation of Main box.config Options

Below are the key options in `/data/adb/box/scripts/box.config`. These options support flexible combinations; for example, you can choose to proxy only mobile data and WiFi, while excluding hotspot and USB tethering. Network interface proxying supports arbitrary combinations (such as proxying only WiFi + hotspot, or only mobile data + USB), but you must correctly configure the corresponding `*_INTERFACE` variables (for example, `MOBILE_INTERFACE="rmnet_data+"`, `WIFI_INTERFACE="wlan0"`, `HOTSPOT_INTERFACE="wlan2"`, `USB_INTERFACE="rndis+"`) to match the actual interface names on your device (which can be checked using `ifconfig` or `ip link`).

| Option                    | Default         | Description |
|---------------------------|-----------------|-------------|
| `bin_name`                | `sing-box`     | Select the proxy core to enable (determines module behavior) |
| `CORE_USER_GROUP`         | `root:net_admin` | User and group under which the core runs (advanced users may change to a custom UID:GID; requires setcap support) |
| `PROXY_TCP_PORT` / `PROXY_UDP_PORT` | `1536` | Transparent proxy listening ports |
| `PROXY_MODE`              | `auto`         | Proxy mode: `auto` (prefer TPROXY), `TPROXY`, `REDIRECT`, `core` (start core only, supports native TUN) |
| `DNS_HIJACK_ENABLE`       | `1`            | DNS hijacking (0=disabled, 1=enable TPROXY, 2=enable REDIRECT; no change needed unless necessary) |
| `DNS_PORT`                | `1053`         | DNS listening port |
| `MOBILE_INTERFACE`        | `rmnet_data+`  | Mobile data interface name |
| `WIFI_INTERFACE`          | `wlan0`        | WiFi interface name |
| `HOTSPOT_INTERFACE`       | `wlan2`        | Hotspot interface name |
| `USB_INTERFACE`           | `rndis+`       | USB tethering interface name |
| `PROXY_MOBILE`            | `1`            | Whether to proxy mobile data traffic (1=proxy, 0=do not proxy; supports arbitrary combinations with other interfaces) |
| `PROXY_WIFI`              | `1`            | Whether to proxy WiFi traffic (1=proxy, 0=do not proxy; supports arbitrary combinations with other interfaces) |
| `PROXY_HOTSPOT`           | `0`            | Whether to proxy hotspot traffic (1=proxy, 0=do not proxy; supports arbitrary combinations; MAC filtering takes effect when enabled) |
| `PROXY_USB`               | `0`            | Whether to proxy USB tethering traffic (1=proxy, 0=do not proxy; supports arbitrary combinations with other interfaces) |
| `PROXY_TCP` / `PROXY_UDP` | `1` / `1`      | Whether to proxy TCP/UDP (1=proxy, 0=do not proxy) |
| `PROXY_IPV6`              | `0`            | Whether to proxy IPv6 (1=proxy, 0=disabled; in REDIRECT mode, the module automatically checks kernel support for `IP6_NF_NAT` and `IP6_NF_TARGET_REDIRECT`; if unsupported, IPv6 proxying will be ineffective) |
| `APP_PROXY_ENABLE`        | `0`            | Enable per-application proxying (1=enable) |
| `APP_PROXY_MODE`          | `blacklist`    | `blacklist` (bypass specified apps) or `whitelist` (proxy only specified apps) |
| `BYPASS_APPS_LIST` / `PROXY_APPS_LIST` | Empty | Application list, format: `"userId:package.name"` (multiple entries separated by spaces, e.g. `"0:com.android.systemui" "10:com.tencent.mm"`) |
| `GID_PROXY_ENABLE`        | `0`            | Enable per-process GID proxying (advanced) |
| `GID_PROXY_MODE`          | `blacklist`    | `blacklist` (bypass specified GIDs) or `whitelist` (proxy only specified GIDs) |
| `BYPASS_GIDS_LIST` / `PROXY_GIDS_LIST` | Empty | GID list (multiple entries separated by spaces) |
| `BYPASS_CN_IP`            | `0`            | Whether to bypass Mainland China IPs (1=enable, 0=disable; requires kernel support for `ipset`; the module automatically checks support, and the feature will be disabled if unsupported; when enabled, the IP list is downloaded from the specified URL) |
| `MAC_FILTER_ENABLE`       | `0`            | Enable MAC address filtering (1=enable, 0=disable; effective only in hotspot mode `PROXY_HOTSPOT=1`) |
| `MAC_PROXY_MODE`          | `blacklist`    | `blacklist` (bypass specified MACs) or `whitelist` (proxy only specified MACs) |
| `BYPASS_MACS_LIST` / `PROXY_MACS_LIST` | Empty | MAC address list (multiple entries separated by spaces, e.g. `"AA:BB:CC:DD:EE:FF" "11:22:33:44:55:66"`) |

## Usage

### General Usage (Recommended)

- The service starts automatically on boot.
- Enable or disable the module via Magisk / KernelSU / APatch Manager to start or stop the service in real time (no reboot required).

#### Per-Application Proxying (Traffic Splitting)

After enabling `APP_PROXY_ENABLE=1`:
- **Blacklist mode** (default): Proxy all applications except those specified in `BYPASS_APPS_LIST`.
- **Whitelist mode**: Proxy only the applications specified in `PROXY_APPS_LIST` (set `APP_PROXY_MODE=whitelist`).

#### Using Core Native TUN Only (No Transparent Proxy)

Set `PROXY_MODE=core`. Transparent proxy rules will not be loaded, and only the core will be started (applicable to TUN inbounds of sing-box/clash/mihomo).

### Advanced Usage

- **Force REDIRECT mode**: `PROXY_MODE=REDIRECT` (UDP will not be proxied unless the core enables TUN).
- **Proxy hotspot traffic**: `PROXY_HOTSPOT=1` (requires correct `HOTSPOT_INTERFACE` setting; MAC filtering becomes effective and can be used to control proxying of connected hotspot devices).
- **Per-process GID traffic splitting**: Enable `GID_PROXY_ENABLE=1` and use `PROXY_GIDS_LIST` or `BYPASS_GIDS_LIST`.

### Manual Mode

After creating an empty file `/data/adb/box/manual`:
- The service will no longer start automatically on boot and cannot be controlled via the Manager.
- Manual commands:
  - Service: `/data/adb/box/scripts/box.service start|stop|restart|status`
  - Transparent proxy: `/data/adb/box/scripts/box.tproxy start|stop|restart`

## Additional Notes

- After modifying the core configuration file, ensure consistency with settings such as ports in `box.config`.
- The module automatically prevents traffic looping (by bypassing local IPs and leveraging the NETFILTER_XT_MATCH_ADDRTYPE feature). However, if the device has a public IP address, it is still recommended to manually add [bypass rules](box/scripts/box.tproxy#L567-L585).
- Logs are located in the `/data/adb/box/run/` directory.


## Uninstallation

- Uninstalling this module via Magisk Manager, KernelSU Manager, or APatch app will delete the `/data/adb/service.d/box4_service.sh` file but retain the Box data directory `/data/adb/box`.
- You can use the command to clear Box data: `rm -rf /data/adb/box`.

## Changelog

[CHANGELOG](changelog.md)

## Stargazers over time

[![Stargazers over time](https://starchart.cc/CHIZI-0618/box4magisk.svg)](https://starchart.cc/CHIZI-0618/box4magisk)
