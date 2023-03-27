#!/sbin/sh

module_dir="/data/adb/modules/box4"

[ -n "$(magisk -v | grep lite)" ] && module_dir=/data/adb/lite_modules/box4

scripts_dir="/data/adb/box/scripts"

(
until [ $(getprop sys.boot_completed) -eq 1 ] ; do
  sleep 3
done
${scripts_dir}/start.sh
)&

inotifyd ${scripts_dir}/box.inotify ${module_dir} > /dev/null 2>&1 &