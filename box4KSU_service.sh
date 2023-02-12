#!/system/bin/sh

module_dir="/data/adb/ksu/modules/box4KernelSU"

scripts_dir="/data/adb/ksu/box/scripts"

(
until [ $(getprop sys.boot_completed) -eq 1 ] ; do
  sleep 3
done
${scripts_dir}/start.sh
)&

inotifyd ${scripts_dir}/box.inotify ${module_dir} > /dev/null 2>&1 &