#!/bin/bash

SPRIGHT=/opt/spright/bin/spright

$SPRIGHT -i rawdata/spright/ground-items.conf
$SPRIGHT -i rawdata/spright/player.conf
$SPRIGHT -i rawdata/spright/enemies.conf
$SPRIGHT -i rawdata/spright/weapons.conf
