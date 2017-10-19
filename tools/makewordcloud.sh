#!/bin/bash

find . -maxdepth 1 -name '*.js' '!' -name 'apdungeon*.js' -exec cat '{}' ';' | ~/tokenizer/parsejs.py --ignore var --names - | wordcloud_cli.py --no_collocations --imagefile apdungeon-wordcloud.png --background white --width 1200 --height 600

