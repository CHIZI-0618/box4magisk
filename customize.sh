#!/sbin/sh

SKIPUNZIP=1
ASH_STANDALONE=1
PATH=/data/adb/ap/bin:/data/adb/ksu/bin:/data/adb/magisk:$PATH

is_true() {
  [ "$1" = true ] || [ "$1" = "true" ]
}

command_exists() {
  command -v "$1" >/dev/null 2>&1
}

download_to_file() {
  local url="$1"
  local output="$2"

  if command_exists curl; then
    curl -fL --connect-timeout 20 --retry 2 -o "$output" "$url"
    return $?
  fi

  if command_exists wget; then
    wget -O "$output" "$url"
    return $?
  fi

  return 127
}

fetch_url() {
  local url="$1"

  if command_exists curl; then
    curl -fsSL --connect-timeout 20 --retry 2 "$url"
    return $?
  fi

  if command_exists wget; then
    wget -qO- "$url"
    return $?
  fi

  return 127
}

github_latest_asset_url() {
  local repo="$1"
  local pattern="$2"
  local response url

  response="$(fetch_url "https://api.github.com/repos/${repo}/releases/latest")" || return 1
  url="$(printf '%s\n' "$response" \
    | grep -o '"browser_download_url":[[:space:]]*"[^"]*"' \
    | sed 's/.*"browser_download_url":[[:space:]]*"\([^"]*\)"/\1/' \
    | grep -E "$pattern" \
    | head -n 1)"

  [ -n "$url" ] || return 1
  printf '%s' "$url"
}

detect_download_arch() {
  local abi machine

  abi="$(getprop ro.product.cpu.abi 2>/dev/null)"
  machine="$(uname -m 2>/dev/null)"

  case "${abi}:${machine}" in
    arm64-v8a:*|*:aarch64|*:arm64)
      printf 'sing-box=arm64 mihomo=arm64-v8 xray=arm64-v8a'
      ;;
    armeabi-v7a:*|*:armv7l|*:armv8l|*:arm)
      printf 'sing-box=armv7 mihomo=armv7 xray=arm32-v7a'
      ;;
    x86_64:*|*:x86_64|*:amd64)
      printf 'sing-box=amd64 mihomo=amd64 xray=64'
      ;;
    x86:*|*:i686|*:i386)
      printf 'sing-box=386 mihomo=386 xray=32'
      ;;
    *)
      return 1
      ;;
  esac
}

install_file() {
  local source_file="$1"
  local target_file="$2"

  mkdir -p "$(dirname "$target_file")" || return 1
  cp "$source_file" "$target_file" || return 1
  chmod 700 "$target_file" || return 1
}

download_sing_box_core() {
  local tmp_dir="$1"
  local arch="$2"
  local output_bin="$3"
  local url archive extract_dir source_bin

  url="$(github_latest_asset_url "SagerNet/sing-box" ".*/sing-box-[^\"]*-android-${arch}\\.tar\\.gz$")" || return 1
  archive="${tmp_dir}/sing-box.tar.gz"
  extract_dir="${tmp_dir}/sing-box"

  mkdir -p "$extract_dir" || return 1
  download_to_file "$url" "$archive" || return 1
  tar -xzf "$archive" -C "$extract_dir" || return 1
  source_bin="$(find "$extract_dir" -type f -name sing-box | head -n 1)"
  [ -n "$source_bin" ] || return 1
  install_file "$source_bin" "$output_bin" || return 1
}

download_mihomo_core() {
  local tmp_dir="$1"
  local arch="$2"
  local output_bin="$3"
  local url archive

  url="$(github_latest_asset_url "MetaCubeX/mihomo" ".*/mihomo-android-${arch}-[^\"]*\\.gz$")" || return 1
  archive="${tmp_dir}/mihomo.gz"

  download_to_file "$url" "$archive" || return 1
  mkdir -p "$(dirname "$output_bin")" || return 1
  gzip -dc "$archive" > "$output_bin" || return 1
  chmod 700 "$output_bin" || return 1
}

download_xray_core() {
  local tmp_dir="$1"
  local arch="$2"
  local output_bin="$3"
  local asset_dir="$4"
  local url archive extract_dir source_bin

  url="$(github_latest_asset_url "XTLS/Xray-core" ".*/Xray-android-${arch}\\.zip$")" || return 1
  archive="${tmp_dir}/xray.zip"
  extract_dir="${tmp_dir}/xray"

  mkdir -p "$extract_dir" || return 1
  download_to_file "$url" "$archive" || return 1
  unzip -oq "$archive" -d "$extract_dir" || return 1
  source_bin="$(find "$extract_dir" -type f -name xray | head -n 1)"
  [ -n "$source_bin" ] || return 1
  install_file "$source_bin" "$output_bin" || return 1

  mkdir -p "$asset_dir" || return 1
  [ -f "${extract_dir}/geoip.dat" ] && cp "${extract_dir}/geoip.dat" "${asset_dir}/geoip.dat"
  [ -f "${extract_dir}/geosite.dat" ] && cp "${extract_dir}/geosite.dat" "${asset_dir}/geosite.dat"
}

auto_download_cores_install() {
  local arch_map sing_box_arch mihomo_arch xray_arch tmp_dir ok_count
  ok_count=0

  arch_map="$(detect_download_arch)" || {
    ui_print "- Warning: Unsupported architecture, skip auto-download."
    return 0
  }
  sing_box_arch="$(printf '%s\n' "$arch_map" | sed -n 's/.*sing-box=\([^ ]*\).*/\1/p')"
  mihomo_arch="$(printf '%s\n' "$arch_map" | sed -n 's/.*mihomo=\([^ ]*\).*/\1/p')"
  xray_arch="$(printf '%s\n' "$arch_map" | sed -n 's/.*xray=\([^ ]*\).*/\1/p')"

  tmp_dir="$(mktemp -d /data/local/tmp/box4-install.XXXXXX 2>/dev/null || mktemp -d /tmp/box4-install.XXXXXX 2>/dev/null)" || {
    ui_print "- Warning: Failed to create temp dir, skip auto-download."
    return 0
  }
  trap 'rm -rf "$tmp_dir"' EXIT INT TERM

  ui_print "- Downloading proxy cores for this device..."

  if download_sing_box_core "$tmp_dir" "$sing_box_arch" "/data/adb/box/bin/sing-box" 2>/dev/null; then
    ui_print "  * sing-box: installed"
    ok_count=$((ok_count + 1))
  else
    ui_print "  * sing-box: failed"
  fi

  if download_mihomo_core "$tmp_dir" "$mihomo_arch" "/data/adb/box/bin/mihomo" 2>/dev/null; then
    ui_print "  * mihomo: installed"
    ok_count=$((ok_count + 1))
  else
    ui_print "  * mihomo: failed"
  fi

  if download_xray_core "$tmp_dir" "$xray_arch" "/data/adb/box/bin/xray" "/data/adb/box/xray" 2>/dev/null; then
    ui_print "  * xray: installed"
    ok_count=$((ok_count + 1))
  else
    ui_print "  * xray: failed"
  fi

  if [ "$ok_count" -eq 0 ]; then
    ui_print "- Warning: Unable to auto-download cores during installation."
  fi
}

if ! is_true "$BOOTMODE" ; then
  abort "Error: Please install in Magisk Manager, KernelSU Manager or APatch"
fi

if is_true "$KSU" && [ "$KSU_VER_CODE" -lt 10670 ] ; then
  abort "Error: Please update your KernelSU"
fi

if is_true "$KSU" && [ "$KSU_VER_CODE" -lt 10683 ] ; then
  service_dir="/data/adb/ksu/service.d"
else 
  service_dir="/data/adb/service.d"
fi

if [ ! -d "$service_dir" ] ; then
    mkdir -p "$service_dir"
fi

unzip -qo "${ZIPFILE}" -x 'META-INF/*' -d "$MODPATH"

if [ -d /data/adb/box ] ; then
  cp /data/adb/box/scripts/box.config /data/adb/box/scripts/box.config.bak
  ui_print "- User configuration box.config has been backed up to box.config.bak"

  cat /data/adb/box/scripts/box.config >> "$MODPATH/box/scripts/box.config"
  cp -f "$MODPATH"/box/scripts/* /data/adb/box/scripts/
  ui_print "- User configuration box.config has been"
  ui_print "- attached to the module box.config,"
  ui_print "- please re-edit box.config"
  ui_print "- after the update is complete."

  awk '!x[$0]++' "$MODPATH/box/scripts/box.config" > /data/adb/box/scripts/box.config

  rm -rf "$MODPATH/box"
else
  mv "$MODPATH/box" /data/adb/
fi

if is_true "$KSU" ; then
  sed -i 's/name=box4magisk/name=box4KernelSU/g' "$MODPATH/module.prop"
fi

if is_true "$APATCH" ; then
  sed -i 's/name=box4magisk/name=box4APatch/g' "$MODPATH/module.prop"
fi

mkdir -p /data/adb/box/bin/
mkdir -p /data/adb/box/run/
auto_download_cores_install

mv -f "$MODPATH/box4_service.sh" "$service_dir/"

rm -f "$MODPATH/customize.sh"

set_perm_recursive $MODPATH 0 0 0755 0644
set_perm_recursive /data/adb/box/ 0 0 0755 0644
set_perm_recursive /data/adb/box/scripts/ 0 0 0755 0700
set_perm_recursive /data/adb/box/bin/ 0 0 0755 0700

set_perm "$service_dir/box4_service.sh" 0 0 0700

# fix "set_perm_recursive /data/adb/box/scripts" not working on some phones.
chmod ugo+x /data/adb/box/scripts/*

for pid in $(pidof inotifyd) ; do
  if grep -q box.inotify /proc/${pid}/cmdline ; then
    kill ${pid}
  fi
done

inotifyd "/data/adb/box/scripts/box.inotify" "$MODPATH" > /dev/null 2>&1 &
