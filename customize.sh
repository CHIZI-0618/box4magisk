#!/sbin/sh

SKIPUNZIP=1
ASH_STANDALONE=1

if [ $BOOTMODE ! = true ] ; then
  abort "Error: Please install in Magisk Manager"
fi

if [ ! -d /data/adb/service.d ] ; then
  mkdir -p /data/adb/service.d
fi

unzip -o "${ZIPFILE}" -x 'META-INF/*' -d $TMPDIR

if [ -d /data/adb/box ] ; then
  cat /data/adb/box/scripts/box.config >> $TMPDIR/box/scripts/box.config
  ui_print "User configuration box.config has been attached to the module box.config,"
  ui_print "please re-edit box.config after the update is complete."

  mv -f $TMPDIR/box/scripts/* /data/adb/box/scripts/

  mv $TMPDIR/README.md $TMPDIR/module.prop $TMPDIR/uninstall.sh $MODPATH/

  mkdir -p /data/adb/box/bin/
else
  mv $TMPDIR/box /data/adb/
fi

mv -f $TMPDIR/box4magisk_service.sh /data/adb/service.d/

set_perm_recursive $MODPATH 0 0 0755 0644
set_perm_recursive /data/adb/box/ 0 3005 0755 0644
set_perm_recursive /data/adb/box/scripts/ 0 3005 0755 0700

set_perm /data/adb/service.d/box4magisk_service.sh 0 0 0700

#fix "set_perm_recursive  /data/adb/sing-box/scripts" not working on some phones. It didn't work on my Oneplus 7 pro and Remi K50.
chmod ugo+x /data/adb/box/scripts/*
