pid=$(/data/adb/box/scripts/box.service status | grep started)
if [[ "${pid}" ]]; then
    echo "Stopping Box."
    /data/adb/box/scripts/box.service stop > /dev/null
    echo "Box is stopped."
else
    echo "Starting Box."
    /data/adb/box/scripts/box.service start > /dev/null
    echo "Box is started."
fi