#!/sbin/sh

SKIPUNZIP=1
ASH_STANDALONE=1

if [ $BOOTMODE ! = true ] ; then
  abort "Error: Please install in Magisk Manager"
fi

if [ ! -d /data/adb/service.d ] ; then
  mkdir -p /data/adb/service.d
fi

unzip -o "${ZIPFILE}" -x 'META-INF/*'  -d $MODPATH

mv $MODPATH/box4magisk_service.sh /data/adb/service.d/
mv $MODPATH/box /data/adb/
rm -f $MODPATH/customize.sh

#temporary fix for Redmi K50, need a generic fix for devices imcompatible with the entry "wlan+" here and instead replace with "ap+"
[ "$(getprop ro.product.device)" = "rubens" ] && echo "ap+" > /data/adb/box/ap.list || echo "wlan+" > /data/adb/box/ap.list

set_perm_recursive $MODPATH 0 0 0755 0644
set_perm_recursive /data/adb/box/ 0 3005 0755 0644
set_perm_recursive /data/adb/box/scripts/ 0 3005 0755 0700
set_perm_recursive /data/adb/box/bin/ 0 3005 0755 0700

set_perm /data/adb/service.d/box4magisk_service.sh 0 0 0700

#fix "set_perm_recursive  /data/adb/sing-box/scripts" not working on some phones. It didn't work on my Oneplus 7 pro and Remi K50.
chmod ugo+x /data/adb/sing-box/scripts/*
