#!/usr/bin/env python
# A simple utility to generate a JSON sprite sheet for the rogue-like-8x8 
# assets. (to make them more usable with pixi.js)

import os
import sys
import PIL, PIL.Image

# Change into the media output folder
path = os.path.dirname(sys.argv[0])
os.chdir(os.path.join(path, "..", "media", "rogue-like-8x8"))

HEADER = """{"frames" : {
"""
FOOTER = """}, "meta" : {
   "app" : "tpack.py conversion",
   "version" : "1",
   "image" : "%(src)s",
   "format" : "RGBA8888",
   "size" : {"W" : %(w)d, "h" : %(h)d},
   "scale" : "1"
}}"""

FRAME_TMP = """"%(name)s" : {
    "frame" : {"x":%(x)d, "y":%(y)d, "w":%(w)d, "h":%(h)d},
    "rotated" : false,
    "trimmed" : false,
    "spriteSourceSize" : {"x":0, "y":0, "w":%(w)d, "h":%(h)d},
    "sourceSize" : {"w":%(w)d, "h":%(h)d}
}"""

def gen_grid(start_pos, tile_size, desc, padding=1):
    rows = len(desc)
    cols = len(desc[0])
    y = start_pos[1]
    for row in range(rows):
        x = start_pos[0]
        for col in range(cols):
            name = desc[row][col]
            if (name):
                txt = FRAME_TMP % {
                    "name" : name, 
                    "x" : x,
                    "y" : y,
                    "w" : tile_size[0], 
                    "h" : tile_size[1]}
                yield txt
            x += tile_size[0]+1
        y += tile_size[1]+1

def save_json_sheet(srcpath, tile_size, get_desc, outer_pad=0, padding=1):
    img = PIL.Image.open(srcpath)

    # 2*outer_pad + tilew*n + padding*(n-1) = img.size[0]
    # 2*outer_pad + tilew*n + padding*n - padding = img.size[0]
    # n*(tilew+padding) = img.size[0] + padding - 2*outer_pad
    # n = (img.size[0] + padding - 2*outer_pad) / (tilew + padding)
    (tilew, tileh) = tile_size

    if ((img.size[0]+padding-2*outer_pad) % (tilew + padding) != 0):
        raise Exception("can't divide sheet into integer number of cols")

    if ((img.size[1]+padding-2*outer_pad) % (tileh + padding) != 0):
        raise Exception("can't divide sheet into integer number of rows")

    cols = (img.size[0]+padding-2*outer_pad) // (tilew + padding)
    rows = (img.size[1]+padding-2*outer_pad) // (tileh + padding)

    out = HEADER
    frames = []
    for row in range(rows):
        for col in range(cols):
            name = get_desc(row, col)
            if (not name): continue
            txt = FRAME_TMP % {
                "name" : name, 
                "x" : (col*(tilew+padding)+outer_pad),
                "y" : (row*(tileh+padding)+outer_pad),
                "w" : tilew, 
                "h" : tileh}
            frames.append(txt)

    out += ",".join(frames)

    out += FOOTER % {
        "src" : srcpath, 
        "w" : img.size[0], 
        "h" : img.size[1]}

    base = os.path.splitext(srcpath)[0]
    open(base + ".json", "w").write(out)

def get_desc(row, col):
    meta = [
        ["melee1", "south"],
        ["melee1", "north"],
        ["melee1", "dying"],
        ["melee2", "south"],
        ["melee2", "north"],
        ["melee2", "dying"],
        ["melee3", "south"],
        ["melee3", "north"],
        ["melee3", "dying"],
        ["melee4", "south"],
        ["melee4", "north"],
        ["melee4", "dying"],
    ]
    return "_".join(meta[row]) + "_" + str(col+1)
save_json_sheet("Male-Melee.png", (8, 8), get_desc)
save_json_sheet("Girl-Melee.png", (8, 8), get_desc)

def get_desc(row, col):
    meta = [
        ["range1", "south"],
        ["range1", "north"],
        ["range1", "dying"],
        ["range2", "south"],
        ["range2", "north"],
        ["range2", "dying"],
        ["range3", "south"],
        ["range3", "north"],
        ["range3", "dying"],
        ["range4", "south"],
        ["range4", "north"],
        ["range4", "dying"],
    ]
    return "_".join(meta[row]) + "_" + str(col+1)
save_json_sheet("Male-Range.png", (8, 8), get_desc)
save_json_sheet("Girl-Range.png", (8, 8), get_desc)

def get_desc(row, col):
    meta = [
        ["mage1", "south"],
        ["mage1", "north"],
        ["mage1", "dying"],
        ["mage2", "south"],
        ["mage2", "north"],
        ["mage2", "dying"],
        ["mage3", "south"],
        ["mage3", "north"],
        ["mage3", "dying"],
        ["mage4", "south"],
        ["mage4", "north"],
        ["mage4", "dying"],
    ]
    return "_".join(meta[row]) + "_" + str(col+1)
save_json_sheet("Male-Mage.png", (8, 11), get_desc)
save_json_sheet("Girl-Mage.png", (8, 11), get_desc)

def get_desc(row, col):
    desc = ["south", "north"][col//3]
    return "npc%d_%s_%d" % (row+1, desc, (col%3)+1)
save_json_sheet("NPC.png", (8, 8), get_desc)

def get_desc(row, col):
    direction = ["north", "south"][row%2]
    names = [
        "crab",
        "scorpion",
        "rat",
        "snake",
        "flame",
        "goblin",
        "mushroom",
        "ghost",
        "eye",
        "slime",
        "bat",
        "plant",
        "boar",
        "mould",
        "skelton_warrior",
        "skelton_ranger",
        "skeleton_mage",
    ]

    extra = (
        ("1", None,   "2",  "3",  "dead"),
        ("1", "idle", "2",  "3",  "dead"), # crab
        ("1", None,   "2",  "3",  "dead"),
        ("1", "2",    "3",  "4",  "dead"), # scorpion
        ("1", None,   None, None, "dead"),
        ("1", "2",    None, None, "dead"), # rat
        ("1", None,   None, None, "dead"),
        ("1", "2",    None, None, "dead"), # snake
        ("1", "idle", "2",  "3",  "dead"),
        ("1", "idle", "2",  "3",  "dead"), # flame
        ("1", "idle", "2",  "3",  "dead"),
        ("1", "idle", "2",  "3",  "dead"), # goblin
        ("1", "idle", "2",  "3",  "dead"),
        ("1", "idle", "2",  "3",  "dead"), # mushroom
        ("1", "2",    None, None, "dead"),
        ("1", "2",    None, None, "dead"), # ghost
        ("1", "2",    None, None, "dead"),
        ("1", "2",    None, None, "dead"), # eye
        ("1", "2",    None, None, "dead"),
        ("1", "2",    None, None, "dead"), # slime
        ("1", "2",    None, None, "dead"),
        ("1", "2",    None, None, "dead"), # bat
        ("1", "idle", "2",  "3",  "dead"),
        ("1", "idle", "2",  "3",  "dead"), # plant
        ("1", "idle", "2",  "3",  "dead"),
        ("1", "idle", "2",  "3",  "dead"), # boar
        ("1", "idle", "2",  "3",  "dead"),
        ("1", "idle", "2",  "3",  "dead"), # mould
        ("1", "2",    "3",  "dead", None),
        ("1", "2",    "3",  "dead", None), # skeleton
        ("1", "2",    "3",  "dead", None),
        ("1", "2",    "3",  "dead", None), # skeleton
        ("1", "2",    "3",  "dead", None),
        ("1", "2",    "3",  "dead", None), # skeleton
    )

    if (not extra[row][col]):
        return None

    return names[row//2] + "_" + direction + "_" + extra[row][col]
    
save_json_sheet("Enemies.png", (8, 8), get_desc)

def get_desc(row, col):
    meta = [
        ["shield1", None, "sword1", None, None],
        ["shield2", None, "sword2", None, None],
        ["shield3", None, "sword3", None, None],
        ["staff1",  "staff2", "staff3", "bow1", "bow2"],
        ["bow3", "arrow", None, None, None],
    ]
    return meta[row][col]

save_json_sheet("Weapons.png", (8, 8), get_desc, outer_pad=1)

###

srcpath = "Tileset.png"
img = PIL.Image.open(srcpath)

desc = [
    ("treading_water",)
]
frames = list(gen_grid((116,94), (10,4), desc))

desc = [
    ("smooth_wall_l", "smooth_wall_m", "smooth_wall_r"),
    ("brick_wall_l", "brick_wall_m", "brick_wall_r"),
    ("mossy_wall_l", "mossy_wall_m", "mossy_wall_r"),
    ("broken_wall_l", "broken_wall_m", "broken_wall_r"),
    ("gate_wall_1", "gate_wall_2", "gate_wall_3"),
    ("window_wall_1", "wall_behind", "wall_behind2")
]
frames += list(gen_grid((1,1), (8,13), desc))

desc = [
    ("smooth_floor_l", "smooth_floor_m", "smooth_floor_r", "door1", "door2", "door3", "door4", "torch", None, None, None),
    ("smooth_floor_bl", "smooth_floor_bm", "smooth_floor_br", "blood1", "blood2", "blood3", "blood4", "chest_closed", "chest_open", "skull1", "skull2"),
    ("water", "green_water", None, "barrel1", "barrel2", "barrel3", "barrel4", "barrel5", "barrel6", "barrel7", "bones"),
    ("bridge_b", "bridge_t", None, "sack1", "sack2", "sack3", "sack4", "sack5", "sack6", None, "mushroom"),
    (None, None, None, "carpet_l", "carpet_m", "carpet_r", None, None, None, None, None),
    (None, None, None, "carpet_bl", "carpet_bm", "carpet_br", None, None, None, None, None),
]
frames += list(gen_grid((28,1), (8,8), desc))

desc = [
    ("bigdoor1", "bigdoor2", "bigdoor3", "bigdoor4"),
]
frames += list(gen_grid((1,86), (24,13), desc))

out = HEADER
out += ",".join(frames)
out += FOOTER % {
    "src" : srcpath, 
    "w" : img.size[0], 
    "h" : img.size[1]}
open("Tileset.json", "w").write(out)

###

def get_desc(row, col):
    meta = [
        ["helmet1", "helmet2", "helmet3", "chest1", "chest2", "chest3"],
        ["pants1", "pants2", "pants3", "sword1", "sword2", "sword3"],
        ["shield1", "shield2", "shield3", "", "", ""],
        ["", "", "", "", "", ""],
        ["", "", "", "bow1", "bow2", "bow3"],
        ["arrow1", "arrow2", "arrow2", "", "", ""],
        ["mhat1", "mhat2", "mhat3", "robe1", "robe2", "robe3"],
        ["", "", "", "staff1", "staff2", "staff3"],
        ["disc1", "disc2", "disc3", "", "", ""],
        ["boots1", "boots2", "boots3", "", "", ""],
        ["amulet1", "amulet2", "amulet3", "ring1", "ring2", "ring3"],
        ["", "", "", "", "", ""],
        ["small_magic", "small_health", "large_magic", "large_health", "", ""],
        ["coin", "mushroom", "heart", "", "", ""],
    ]
    return meta[row][col]

save_json_sheet("GroundItems.png", (8, 8), get_desc, outer_pad=1)