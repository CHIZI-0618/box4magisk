#!/sbin/sh

SKIPUNZIP=1
ASH_STANDALONE=1

if [ $BOOTMODE ! = true ] ; then
  abort "Error: Please install in KernelSU Manager"
fi

if [ ! -d /data/adb/ksu/service.d ] ; then
  mkdir -p /data/adb/ksu/service.d
fi
if [ ! -d /data/adb/service.d ] ; then
  mkdir -p /data/adb/service.d
fi

unzip -qo "${ZIPFILE}" -x 'META-INF/*' -d $MODPATH

if [ -d /data/adb/ksu/box ] ; then
  cp /data/adb/ksu/box/scripts/box.config /data/adb/ksu/box/scripts/box.config.bak
  ui_print "- User configuration box.config has been backed up to box.config.bak"

  cat /data/adb/ksu/box/scripts/box.config >> $MODPATH/box/scripts/box.config
  cp -f $MODPATH/box/scripts/* /data/adb/ksu/box/scripts/
  ui_print "- User configuration box.config has been"
  ui_print "- attached to the module box.config,"
  ui_print "- please re-edit box.config"
  ui_print "- after the update is complete."

  awk '!x[$0]++' $MODPATH/box/scripts/box.config > /data/adb/ksu/box/scripts/box.config

  rm -rf $MODPATH/box
else
  mv $MODPATH/box /data/adb/ksu
fi

mkdir -p /data/adb/ksu/box/bin/
mkdir -p /data/adb/ksu/box/run/

cp -f $MODPATH/box4KSU_service.sh /data/adb/ksu/service.d/
mv -f $MODPATH/box4KSU_service.sh /data/adb/service.d/

rm -f customize.sh

set_perm_recursive $MODPATH 0 0 0755 0644
set_perm_recursive /data/adb/ksu/box/ 0 0 0755 0644
set_perm_recursive /data/adb/ksu/box/scripts/ 0 0 0755 0700
set_perm_recursive /data/adb/ksu/box/bin/ 0 0 0755 0700

set_perm /data/adb/ksu/service.d/box4KSU_service.sh 0 0 0700
set_perm /data/adb/service.d/box4KSU_service.sh 0 0 0700

#fix "set_perm_recursive /data/adb/ksu/box/scripts" not working on some phones. It didn't work on my Oneplus 7 pro and Remi K50.
chmod ugo+x /data/adb/ksu/box/scripts/*
chmod ugo+x /data/adb/ksu/box/bin/*
