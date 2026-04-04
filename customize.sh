#!/sbin/sh

SKIPUNZIP=1
ASH_STANDALONE=1

merge_box_config() {
  local new_config="$1"
  local old_config="$2"
  local merged_config="$3"

  awk '
    function is_assignment(line) {
      return line ~ /^[[:space:]]*[A-Za-z_][A-Za-z0-9_]*=/
    }
    function key_of(line, key) {
      key = line
      sub(/^[[:space:]]*/, "", key)
      sub(/=.*/, "", key)
      return key
    }
    FNR == NR {
      if (is_assignment($0)) {
        key = key_of($0)
        old_line[key] = $0
        if (!(key in old_seen)) {
          old_order[++old_count] = key
          old_seen[key] = 1
        }
      }
      next
    }
    {
      if (is_assignment($0)) {
        key = key_of($0)
        if (key in old_line) {
          print old_line[key]
          used_old[key] = 1
        } else {
          print $0
        }
        next
      }
      print $0
    }
    END {
      appended = 0
      for (index = 1; index <= old_count; index++) {
        key = old_order[index]
        if (!(key in used_old)) {
          if (!appended) {
            print ""
            print "# Preserved custom values from previous box.config"
            appended = 1
          }
          print old_line[key]
        }
      }
    }
  ' "$old_config" "$new_config" > "$merged_config"
}

if [ "$BOOTMODE" ! = true ] ; then
  abort "Error: Please install in Magisk Manager, KernelSU Manager or APatch"
fi

if [ "$KSU" = true ] && [ "$KSU_VER_CODE" -lt 10670 ] ; then
  abort "Error: Please update your KernelSU"
fi

if [ "$KSU" = true ] && [ "$KSU_VER_CODE" -lt 10683 ] ; then
  service_dir="/data/adb/ksu/service.d"
else 
  service_dir="/data/adb/service.d"
fi

if [ ! -d "$service_dir" ] ; then
    mkdir -p $service_dir
fi

unzip -qo "${ZIPFILE}" -x 'META-INF/*' -d $MODPATH

if [ -d /data/adb/box ] ; then
  old_config="/data/adb/box/scripts/box.config"
  new_config="$MODPATH/box/scripts/box.config"
  merged_config="$MODPATH/box.config.merged"

  cp "$old_config" /data/adb/box/scripts/box.config.bak
  ui_print "- User configuration box.config has been backed up to box.config.bak"

  merge_box_config "$new_config" "$old_config" "$merged_config"
  cp -f $MODPATH/box/scripts/* /data/adb/box/scripts/
  mv -f "$merged_config" /data/adb/box/scripts/box.config
  ui_print "- User configuration box.config has been"
  ui_print "- merged into the new module template."
  ui_print "- Existing values are preserved by key."

  rm -rf $MODPATH/box
else
  mv $MODPATH/box /data/adb/
fi

if [ "$KSU" = true ] ; then
  sed -i 's/name=box4magisk/name=box4KernelSU/g' $MODPATH/module.prop
fi

if [ "$APATCH" = true ] ; then
  sed -i 's/name=box4magisk/name=box4APatch/g' $MODPATH/module.prop
fi

mkdir -p /data/adb/box/bin/
mkdir -p /data/adb/box/run/

mv -f $MODPATH/box4_service.sh $service_dir/

rm -f customize.sh

set_perm_recursive $MODPATH 0 0 0755 0644
set_perm_recursive /data/adb/box/ 0 0 0755 0644
set_perm_recursive /data/adb/box/scripts/ 0 0 0755 0700
set_perm_recursive /data/adb/box/bin/ 0 0 0755 0700

set_perm $service_dir/box4_service.sh 0 0 0700

# fix "set_perm_recursive /data/adb/box/scripts" not working on some phones.
chmod ugo+x /data/adb/box/scripts/*

for pid in $(pidof inotifyd) ; do
  if grep -q box.inotify /proc/${pid}/cmdline ; then
    kill ${pid}
  fi
done

inotifyd "/data/adb/box/scripts/box.inotify" "$MODPATH" > /dev/null 2>&1 &
