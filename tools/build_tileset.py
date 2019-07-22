#!/usr/bin/env python3

from xml.etree import ElementTree
import json
import PIL, PIL.Image
import os

class Tileset:
    tile_width = 0
    tile_height = 0
    spacing = 1
    margin = 1
    src = None
    image = None

    tiles = None

    def __init__(self):
        self.tiles = {}

def load_tileset(src):
    root = ElementTree.parse(src)

    tileset_node = root.find('.')

    tileset = Tileset()
    tileset.tile_width = int(tileset_node.attrib['tilewidth'])
    tileset.tile_height = int(tileset_node.attrib['tileheight'])
    tileset.spacing = int(tileset_node.attrib['spacing'])
    tileset.margin = int(tileset_node.attrib['margin'])

    # Note: the tileset image is relative to the loaded tileset file
    img_node = root.find('./image')
    img_src = img_node.attrib['source']
    tileset.src = os.path.abspath(
        os.path.join(
            os.path.dirname(src),
            img_src,
        )
    )

    for tile_node in root.findall('./tile'):
        tile = {}
        try:
            tile['type'] = tile_node.attrib['type']
        except KeyError:
            tile['type'] = ''

        for prop_node in tile_node.findall('./properties/property'):
            name = prop_node.attrib['name']
            ptype = prop_node.attrib['type']
            value = prop_node.attrib['value']
            if ptype == 'bool':
                value = value == 'true'
            tile[name] = value

        tile_id = tile_node.attrib['id']
        tileset.tiles[tile_id] = tile

    return tileset

def dump_tileset(tileset, dest):
    data = {
        'tile_width' : tileset.tile_width,
        'tile_height' : tileset.tile_height,
        'tiles' : {
            tile_id : props
            for tile_id, props in tileset.tiles.items()
        },
    }
    with open(dest, 'w') as fd:
        fd.write(json.dumps(data, indent=4))

def dump_sprite_atlas(tileset, dest):
    img = PIL.Image.open(tileset.src)
    img_width, img_height = img.size

    tile_width = tileset.tile_width
    tile_height = tileset.tile_height
    margin = tileset.margin
    spacing = tileset.spacing

    rows = (img_height - 2*margin + spacing) // (tile_height + spacing)
    cols = (img_width - 2*margin + spacing) // (tile_width + spacing)

    assert 2*margin + (rows-1)*spacing + rows*tile_height == img_height
    assert 2*margin + (cols-1)*spacing + cols*tile_width == img_width

    frames = {}

    x = margin
    y = margin
    tile_id = 0
    for row in range(rows):
        x = margin
        for col in range(cols):
            frames[str(tile_id)] = {
                'frame' : {
                    'x' : x,
                    'y' : y,
                    'w' : tile_width,
                    'h' : tile_height,
                },
                'rotated' : False,
                'trimmed' : False,
                'spriteSourceSize' : {
                    'x' : 0,
                    'y' : 0,
                    'w' : tile_width,
                    'h' : tile_height,
                },
                'sourceSize' : {
                    'w' : tile_width,
                    'h' : tile_height,
                }
            }

            x += tile_width + spacing
            tile_id += 1

        y += tile_height + spacing

    data = {
        'frames' : frames,
        'meta' : {
            'app' : 'build_tileset.py',
            'version' : '1',
            'image' : os.path.basename(tileset.src),
            'format' : 'RGBA8888',
            'size' : {'w' : img_width, 'h' : img_height},
            'scale' : '1',
        }
    }
    with open(dest, 'w') as fd:
        fd.write(json.dumps(data, indent=4))

if __name__ == '__main__':
    src = './rawdata/maps/Tileset2.tsx'
    tileset = load_tileset(src)

    dump_tileset(tileset, './app/src/assets/map.tileset.json')

    dest = os.path.join(
        os.path.dirname(tileset.src),
        'Tileset2.json'
    )

    dump_sprite_atlas(tileset, dest)
