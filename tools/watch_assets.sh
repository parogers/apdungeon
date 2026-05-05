#!/bin/bash

while inotifywait -e close_write -r -q rawdata; do
    ./tools/make_assets.sh
done
