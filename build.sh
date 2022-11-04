#!/bin/sh

zip -r -o -X -ll box4magisk.zip ./ -x '.git/*' -x 'build.sh' -x '.github/*'
