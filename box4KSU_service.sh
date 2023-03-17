#!/system/bin/sh

busybox_path="/data/adb/ksu/bin/busybox"

module_dir="/data/adb/modules/box4KSU"

scripts_dir="/data/adb/ksu/box/scripts"

(
until [ $(getprop sys.boot_completed) -eq 1 ] ; do
  sleep 3
done
${scripts_dir}/start.sh
)&

${busybox_path} inotifyd ${scripts_dir}/box.inotify ${module_dir} > /dev/null 2>&1 &