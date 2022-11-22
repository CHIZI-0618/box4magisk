#!/sbin/sh

SKIPUNZIP=1
ASH_STANDALONE=1

if [ $BOOTMODE ! = true ] ; then
  abort "Error: Please install in Magisk Manager"
fi

if [ ! -d /data/adb/service.d ] ; then
  mkdir -p /data/adb/service.d
fi

unzip -qo "${ZIPFILE}" -x 'META-INF/*' -d $MODPATH

if [ -d /data/adb/box ] ; then
  cat /data/adb/box/scripts/box.config >> $MODPATH/box/scripts/box.config
  ui_print "- User configuration box.config has been"
  ui_print "- attached to the module box.config,"
  ui_print "- please re-edit box.config"
  ui_print "- after the update is complete."

  mv -f $MODPATH/box/scripts/* /data/adb/box/scripts/

  rm -rf $MODPATH/box

  mkdir -p /data/adb/box/bin/
else
  mv $MODPATH/box /data/adb/
fi

mv -f $MODPATH/box4magisk_service.sh /data/adb/service.d/

rm -f customize.sh

set_perm_recursive $MODPATH 0 0 0755 0644
set_perm_recursive $MODPATH/system/bin/ 0 0 0755 0755
set_perm_recursive /data/adb/box/ 0 3005 0755 0644
set_perm_recursive /data/adb/box/scripts/ 0 3005 0755 0700

set_perm /data/adb/service.d/box4magisk_service.sh 0 0 0700

#fix "set_perm_recursive /data/adb/box/scripts" not working on some phones. It didn't work on my Oneplus 7 pro and Remi K50.
chmod ugo+x /data/adb/box/scripts/*
