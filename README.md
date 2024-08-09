# Box4Magisk/KernelSU/APatch

[中文](README_zh.md)

This project deploys clash, mihomo, sing-box, v2ray, xray, hysteria proxies via [Magisk](https://github.com/topjohnwu/Magisk), [KernelSU](https://github.com/tiann/KernelSU), or [APatch](https://github.com/bmax121/APatch). It supports REDIRECT (TCP only), TPROXY (TCP + UDP), and TUN (TCP + UDP, provided by the cores). It also supports a mixed mode of REDIRECT (TCP) + TUN (UDP) proxy.

## Disclaimer

This project is not responsible for the following: bricked devices, SD card corruption, or SoC burnouts.

**Please ensure your configuration file does not cause a traffic loop, as this may lead to infinite device reboots.**

If you're not sure how to configure this module, you might need applications like ClashForAndroid, sing-box for Android, v2rayNG, surfboard, SagerNet, AnXray, etc.

## Installation

- Download the module package from the [Release](https://github.com/CHIZI-0618/box4magisk/releases) page, and install it via Magisk Manager, KernelSU Manager, or APatch.
- Supports online updates via Magisk Manager (effective immediately after the update without reboot).
- User configuration is backed up during module updates and appended to the new `/data/adb/box/scripts/box.config` file (in shell, later-defined variables override previous ones, but it's recommended to edit the `box.config` file after updating to remove redundant definitions and deprecated fields).

### Note

The module does not include binary executables for [clash](https://github.com/Dreamacro/clash), [mihomo](https://github.com/MetaCubeX/mihomo), [sing-box](https://github.com/SagerNet/sing-box), [v2ray-core](https://github.com/v2fly/v2ray-core), [xray-core](https://github.com/XTLS/Xray-core), [hysteria](https://github.com/apernet/hysteria).

After installing the module, please download the core files for your device's architecture and place them in the `/data/adb/box/bin/` directory.

## Configuration

- Each core works in the `/data/adb/box/core_name` directory, where the core_name is defined in the `bin_name` variable of the `/data/adb/box/scripts/box.config` file. The valid values are `clash`, `mihomo`, `sing-box`, `xray`, `v2ray`, `hysteria`, and the `bin_name` **determines the core enabled by the module**.
- The configuration files for each core must be customized by the user. The module script checks the validity of the configuration, and the check results are stored in the `/data/adb/box/run/check.log` file.
- Tip: The `mihomo` and `sing-box` cores come with default configurations prepared for working with the transparent proxy script. It is recommended to edit the `proxy-providers` or `outbounds` sections to add your proxy server. For advanced configurations, please refer to the respective official documentation. Links: [Clash documentation](https://github.com/Dreamacro/clash/wiki/configuration), [Mihomo documentation](https://wiki.metacubex.one), [Sing-box documentation](https://sing-box.sagernet.org/), [V2Ray documentation](https://www.v2fly.org/), [Xray documentation](https://xtls.github.io/), [Hysteria documentation](https://v2.hysteria.network/).

## Usage

### Regular Method (Default & Recommended)

#### Managing Service Start and Stop

**The following core services are collectively referred to as Box.**

- The Box service will automatically run after the system starts.
- You can start or stop the Box service in **real-time** via the Magisk Manager app, **without needing to reboot your device**. Starting the service may take a few seconds, while stopping the service may take effect immediately.

#### Selecting Applications to be Proxied

- Box proxies all applications (APPs) for all Android users by default.

- If you want Box to proxy all applications (APPs) except certain ones, open the `/data/adb/box/scripts/box.config` file, change the `proxy_mode` value to `blacklist` (default value), and add elements to the `user_packages_list` array. The format for each element is `android_user:package_name`, separated by spaces. This will **exclude** the specified apps from being proxied. For example, `user_packages_list=("0:com.android.captiveportallogin" "10:com.tencent.mm")` excludes the CaptivePortalLogin app for user 0 and WeChat for user 10.

- If you want to only proxy certain applications (APPs), open the `/data/adb/box/scripts/box.config` file, change the `proxy_mode` value to `whitelist`, and add elements to the `user_packages_list` array. The format for each element is `android_user:package_name`, separated by spaces. This will **only proxy** the specified apps. For example, `user_packages_list=("0:com.termux" "10:org.telegram.messenger")` proxies Termux for user 0 and Telegram for user 10.

- When the `proxy_mode` value is `core`, the transparent proxy will not work, and **only** the core will be started, which can be used to support native TUN inbound of some cores (sing-box, clash, mihomo).

### Advanced Usage

#### Changing Proxy Mode

- Box uses TPROXY transparent proxy for TCP + UDP by default. If the device does not support TPROXY, it will automatically use REDIRECT to proxy TCP only.

- Open the `/data/adb/box/scripts/box.config` file, and change the `proxy_method` value to `REDIRECT` or `MIXED` to use REDIRECT to proxy TCP. If TUN is not enabled in the core (only Sing-box, Clash, Mihomo supports TUN), UDP will not be proxied.

#### Changing the User to Run the Box Service

- Box runs with the `root:net_admin` user group by default.

- Open the `/data/adb/box/scripts/box.config` file and change the `box_user_group` value to an existing `UID:GID` on the device. In this case, the core used by Box must be in the `/system/bin/` directory (can use Magisk) and requires the `setcap` binary, which is included in [libcap](https://android.googlesource.com/platform/external/libcap/).

#### Bypassing Transparent Proxy when Connecting to WLAN or Enabling Hotspot

- Box proxies the local device, hotspot, and USB tethering by default.

- Open the `/data/adb/box/scripts/box.config` file, and add the `wlan+` element to the `ignore_out_list` array to bypass WLAN in transparent proxy, leaving the hotspot unaffected.

- Open the `/data/adb/box/scripts/box.config` file and remove the `wlan+` element from the `ap_list` array to stop proxying the hotspot (MediaTek devices may use `ap+` instead of `wlan+`, which can be checked with the `ifconfig` command).

#### Transparent Proxy for Specific Processes

- Box proxies all processes by default.

- If you want Box to proxy all processes except certain ones, open the `/data/adb/box/scripts/box.config` file, change the `proxy_mode` value to `blacklist` (default value), and add GID elements to the `gid_list` array, separated by spaces. This will **exclude** the specified GID processes from being proxied.

- If you want to only proxy specific processes, open the `/data/adb/box/scripts/box.config` file, change the `proxy_mode` value to `whitelist`, and add GID elements to the `gid_list` array, separated by spaces. This will **only proxy** the specified GID processes.

> Tip: Since Android's iptables does not support PID extension matching, Box matches processes indirectly by matching GID. Android can use the busybox setuidgid command to start specific processes with a specific UID and any GID.

#### Entering Manual Mode

If you want to control the Box service entirely via command-line, simply create a file `/data/adb/box/manual`. In this case, the Box service will **not start automatically** when your device boots, and you won't be able to manage the Box service's start or stop via Magisk Manager or KernelSU Manager apps.

##### Managing Service Start and Stop

- The Box service script is `/data/adb/box/scripts/box.service`.

- For example, in the test environment (Magisk version: 25200):

  - Start the service:

    `/data/adb/box/scripts/box.service start`

  - Stop the service:

    `/data/adb/box/scripts/box.service stop`

  - Restart the service:

    `/data/adb/box/scripts/box.service restart`

  - Show status:

    `/data/adb/box/scripts/box.service status`
  
##### Managing Whether the Transparent Proxy is Enabled

- The transparent proxy script is `/data/adb/box/scripts/box.tproxy`.

- For example, in the test environment (Magisk version: 25200):

  - Enable the transparent proxy:

    `/data/adb/box/scripts/box.tproxy enable`

  - Disable the transparent proxy:

    `/data/adb/box/scripts/box.tproxy disable`

  - Reload the transparent proxy:

    `/data/adb/box/scripts/box.tproxy renew`

## Additional Notes

- When modifying the configuration files for each core, please ensure that the relevant configuration matches the definitions in the `/data/adb/box/scripts/box.config` file.

- ~~Box service can use [yq](https://github.com/mikefarah/yq) [to modify user configuration](box/scripts/box.service#L13-L17).~~

- When the Box service is started for the first time (or using the box.tproxy renew command), the local machine IP will be added to the bypass list to prevent traffic loops. It will also start monitoring and insert local IP anti-loopback rules when network changes occur. However, if the local machine has a **public IP** address, it is still recommended to add the IP to the `intranet` array in the `/data/adb/box/scripts/box.config` file, or you may try [uncommenting these three lines](box/scripts/box.tproxy#L187-L189).

- The logs for the Box service are in the `/data/adb/box/run` directory.

## Uninstallation

- Uninstalling this module via Magisk Manager, KernelSU Manager, or APatch app will delete the `/data/adb/service.d/box4_service.sh` file but retain the Box data directory `/data/adb/box`.
- You can use the command to clear Box data: `rm -rf /data/adb/box`.

## Changelog

[CHANGELOG](changelog.md)

## Stargazers over time

[![Stargazers over time](https://starchart.cc/CHIZI-0618/box4magisk.svg)](https://starchart.cc/CHIZI-0618/box4magisk)
