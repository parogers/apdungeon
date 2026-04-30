#!/bin/bash

SPRIGHT=/opt/spright/bin/spright

for SRC in rawdata/spright/*.conf; do
    $SPRIGHT -i $SRC
done

for SRC in rawdata/tiles/*.conf; do
    $SPRIGHT -i $SRC -p ./public/tiles
done
