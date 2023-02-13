#!/bin/sh

zip -r -o -X -ll box4KSU_$(cat module.prop | grep 'version=' | awk -F '=' '{print $2}').zip ./ -x '.git/*' -x 'build.sh' -x '.github/*' -x 'box4magisk.json'
