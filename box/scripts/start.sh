#!/system/bin/sh

MODDIR=/data/adb/modules/box4magisk

scripts=$(realpath $0)
scripts_dir=$(dirname ${scripts})

wait_until_login(){
  # we doesn't have the permission to rw "/sdcard" before the user unlocks the screen
  local test_file="/sdcard/Android/.BOXTEST"
  true > "$test_file"
  while [ ! -f "$test_file" ] ; do
    true > "$test_file"
    sleep 1
  done
  rm "$test_file"
}

wait_until_login

if [ ! -f /data/adb/box/manual ] && [ ! -f ${MODDIR}/disable ] ; then
  mv /data/adb/box/run/run.log /data/adb/box/run/run.log.bak
  ${scripts_dir}/box.service start && ${scripts_dir}/box.tproxy enable
fi
