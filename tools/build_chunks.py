#!/usr/bin/env python3

import json
from xml.etree import ElementTree
import os

from build_tileset import load_tileset

class Object:
    name = ''
    type = ''
    x = 0
    y = 0

class Layer:
    name = ''
    grid = None

    def __init__(self):
        self.grid = []

class Chunk:
    name = ''
    objects = None
    layers = None

    def __init__(self):
        self.layers = {}
        self.objects = []

def parse_chunk(tileset, src):
    root = ElementTree.parse(src)

    map_node = root.find('.')
    tileset_node = root.find('./tileset')

    tileset_src = tileset_node.attrib['source']
    first_tile_id = int(tileset_node.attrib['firstgid'])

    chunk = Chunk()
    chunk.name = os.path.basename(
        os.path.splitext(src)[0]
    )

    # Parse the layers
    for layer_node in root.findall('./layer'):
        data_node = layer_node.find('./data')
        assert data_node.attrib['encoding'] == 'csv'

        layer = Layer()
        layer.name = layer_node.attrib['name']
        chunk.layers[layer.name] = layer

        # Parse the tiles for this layer
        for row_data in data_node.text.split():
            layer.grid.append([])
            for tile in row_data.split(','):
                if tile != '':
                    layer.grid[-1].append(int(tile)-first_tile_id)

        # Make sure the grid size actually works out
        assert len(layer.grid) == int(layer_node.attrib['height'])
        assert len(layer.grid[0]) == int(layer_node.attrib['width'])

    # Parse the object layer
    for object_node in root.findall('./objectgroup[@name="things"]/object'):
        obj = Object()
        obj.x = float(object_node.attrib['x']) + float(object_node.attrib['width'])/2
        obj.y = float(object_node.attrib['y']) - float(object_node.attrib['height'])/2
        obj.tile = int(object_node.attrib['gid']) - first_tile_id
        try:
            obj.name = object_node.attrib['name']
        except KeyError:
            pass
        # Lookup the tile from the terrain tile
        obj.type = tileset.tiles[str(obj.tile)]['type']

        chunk.objects.append(obj)

    return chunk


def dump_chunk(chunk):
    def dump_object(obj):
        return {
            'name' : obj.name,
            'type' : obj.type,
            'x' : obj.x,
            'y' : obj.y,
        }

    try:
        midground_grid = chunk.layers['midground'].grid
    except KeyError:
        midground_grid = []

    try:
        background_grid = chunk.layers['background'].grid
    except KeyError:
        background_grid = []

    data = {
        'midground' : midground_grid,
        'background' : background_grid,
        'things' : [dump_object(obj) for obj in chunk.objects],
    }
    return data

if __name__ == '__main__':
    base_path = os.path.join('rawdata', 'maps')

    tileset = load_tileset(os.path.join(base_path, 'Tileset2.tsx'))

    # Load all the map chunks
    chunks_by_name = {}
    for fname in filter(
            lambda fname: fname.endswith('.tmx'),
            os.listdir(base_path),
    ):
        chunk = parse_chunk(tileset, os.path.join(base_path, fname))
        chunks_by_name[chunk.name] = chunk

    # Dump the map chunks as a single json blob
    json_data = {}
    for name, chunk in chunks_by_name.items():
        json_data[name] = dump_chunk(chunk)

    print(json.dumps(json_data))
