#!/usr/bin/env python3

import json
import PIL, PIL.Image
import os

TILE_WIDTH = 8
TILE_HEIGHT = 8
MARGIN = 1
SPACING = 1

tileset_src = './app/src/assets/media/rogue-like-8x8/Tileset2.png'
dest = os.path.join(
    os.path.dirname(tileset_src),
    'Tileset2.json'
)

img = PIL.Image.open(tileset_src)
img_width, img_height = img.size

rows = (img_height - 2*MARGIN + SPACING) // (TILE_HEIGHT+SPACING)
cols = (img_width - 2*MARGIN + SPACING) // (TILE_WIDTH+SPACING)

assert 2*MARGIN + (rows-1)*SPACING + rows*TILE_HEIGHT == img_height
assert 2*MARGIN + (cols-1)*SPACING + cols*TILE_HEIGHT == img_width

frames = {}

x = MARGIN
y = MARGIN
tile_id = 0
for row in range(rows):
    x = MARGIN
    for col in range(cols):
        frames[str(tile_id)] = {
            "frame" : {
                "x" : x,
                "y" : y,
                "w" : TILE_WIDTH,
                "h" : TILE_HEIGHT,
            },
            "rotated" : False,
            "trimmed" : False,
            "spriteSourceSize" : {
                "x" : 0,
                "y" : 0,
                "w" : TILE_WIDTH,
                "h" : TILE_HEIGHT,
            },
            "sourceSize" : {
                "w" : TILE_WIDTH,
                "h" : TILE_HEIGHT,
            }
        }

        x += TILE_WIDTH + SPACING
        tile_id += 1

    y += TILE_HEIGHT + SPACING

data = {
    "frames" : frames,
    "meta" : {
        "app" : "build_tileset.py conversion",
        "version" : "1",
        "image" : os.path.basename(tileset_src),
        "format" : "RGBA8888",
        "size" : {"W" : img_width, "h" : img_height},
        "scale" : "1"
    }
}

with open(dest, 'w') as fd:
    fd.write(json.dumps(data, indent=4))
