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

while [ ! -f /data/misc/net/rt_tables ] ; do
  sleep 3
done

net_dir="/data/misc/net"
#Use inotifyd to monitor write events in the /data/misc/net directory for network changes, perhaps we have a better choice of files to monitor (the /proc filesystem is unsupported) and cyclic polling is a bad solution
inotifyd ${scripts_dir}/net.inotify ${net_dir} > /dev/null 2>&1 &