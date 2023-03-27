#!/sbin/sh

SKIPUNZIP=1
ASH_STANDALONE=1

if ! [ "$BOOTMODE" ] ; then
  abort "Error: Please install in Magisk Manager or KernelSU Manager"
elif [ "$KSU" ] && [ "$KSU_VER_CODE" -lt 10670 ]; then
  abort "Error: Please update your KernelSU and KernelSU Manager"
fi

if [ "$KSU" ] && [ "$KSU_VER_CODE" -lt 10683 ]; then
  if [ ! -d /data/adb/ksu/service.d ] ; then
    mkdir -p /data/adb/ksu/service.d
  fi
else 
  if [ ! -d /data/adb/service.d ] ; then
    mkdir -p /data/adb/service.d
  fi
fi

unzip -qo "${ZIPFILE}" -x 'META-INF/*' -d $MODPATH

if [ -d /data/adb/box ] ; then
  cp /data/adb/box/scripts/box.config /data/adb/box/scripts/box.config.bak
  ui_print "- User configuration box.config has been backed up to box.config.bak"

  cat /data/adb/box/scripts/box.config >> $MODPATH/box/scripts/box.config
  cp -f $MODPATH/box/scripts/* /data/adb/box/scripts/
  ui_print "- User configuration box.config has been"
  ui_print "- attached to the module box.config,"
  ui_print "- please re-edit box.config"
  ui_print "- after the update is complete."

  awk '!x[$0]++' $MODPATH/box/scripts/box.config > /data/adb/box/scripts/box.config

  rm -rf $MODPATH/box
else
  mv $MODPATH/box /data/adb/
fi

if [ "$KSU" ] ; then
  sed -i 's/name=box4magisk/name=box4KernelSU/g' module.prop
fi

mkdir -p /data/adb/box/bin/
mkdir -p /data/adb/box/run/

if [ "$KSU" ] && [ "$KSU_VER_CODE" -lt 10683 ]; then
  mv -f $MODPATH/box4_service.sh /data/adb/ksu/service.d/
else 
  mv -f $MODPATH/box4_service.sh /data/adb/service.d/
fi

rm -f customize.sh

set_perm_recursive $MODPATH 0 0 0755 0644
set_perm_recursive /data/adb/box/ 0 0 0755 0644
set_perm_recursive /data/adb/box/scripts/ 0 0 0755 0700
set_perm_recursive /data/adb/box/bin/ 0 0 0755 0700

if [ "$KSU" ] && [ "$KSU_VER_CODE" -lt 10683 ]; then
  set_perm /data/adb/ksu/service.d/box4_service.sh 0 0 0700
else 
  set_perm /data/adb/service.d/box4_service.sh 0 0 0700
fi

# fix "set_perm_recursive /data/adb/box/scripts" not working on some phones.
chmod ugo+x /data/adb/box/scripts/*

for pid in $(pidof inotifyd) ; do
  if grep -q box.inotify /proc/${pid}/cmdline ; then
    kill ${pid}
  fi
done

inotifyd "/data/adb/box/scripts/box.inotify" "/data/adb/modules/box4" > /dev/null 2>&1 &
