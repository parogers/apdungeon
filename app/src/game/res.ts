/* APDUNGEON - A dungeon crawler demo written in javascript + pixi.js
 * Copyright (C) 2017  Peter Rogers (peter.rogers@gmail.com)
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 * 
 * See LICENSE.txt for the full text of the license.
 */

export var RES = {
    MALE_MELEE: 'assets/media/rogue-like-8x8/Male-Melee.json',
    FEMALE_MELEE: 'assets/media/rogue-like-8x8/Girl-Melee.json',
    NPC_TILESET: 'assets/media/rogue-like-8x8/NPC.json',
    MAPTILES: 'assets/media/rogue-like-8x8/Tileset2.json',
    ENEMIES: 'assets/media/rogue-like-8x8/Enemies.json',
    WEAPONS: 'assets/media/rogue-like-8x8/Weapons.json',
    GROUND_ITEMS: 'assets/media/rogue-like-8x8/GroundItems.json',
    UI: 'assets/media/rogue-like-8x8/UI.json',
    //DRAGON: 'assets/media/rogue-like-8x8/Dragon.json',
    MAP_OBJS: 'assets/media/rogue-like-8x8/MapObjects.json',

    GAME_MUSIC: 'assets/media/music/A Journey Awaits2-lowfi.ogg',
    ATTACK_SWORD_SND: 'assets/media/effects/attack_sword2.wav',
    HIT_SND: 'assets/media/effects/hit.wav',
    SNAKE_HURT_SND: 'assets/media/effects/snake_hurt.wav',
    DEAD_SND: 'assets/media/effects/dead.wav',
    SPLASH_SND: 'assets/media/effects/splash.wav',
    ARROW_DING_SND: 'assets/media/effects/arrow_ding.wav',
    GO_SND: 'assets/media/effects/go.wav',
    COIN_SND: 'assets/media/effects/coin.wav',
    GATE_SND: 'assets/media/effects/gate.wav',
    DROP_SND: 'assets/media/effects/drop.wav',
    POWERUP1_SND: 'assets/media/effects/powerup1.wav',
    POWERUP2_SND: 'assets/media/effects/powerup2.wav',
    POWERUP3_SND: 'assets/media/effects/powerup3.wav',
    POWERUP4_SND: 'assets/media/effects/powerup4.wav',
    CHEST_SND: 'assets/media/effects/chest_open.wav',

    CHUNKS: 'assets/map.chunks.json',
    TILESET: 'assets/map.tileset.json',

    TILE_WIDTH: 8,
    TILE_HEIGHT: 8,
    WALL_HEIGHT: 13,
};


export var ANIM = {
    SNAKE_WALK: {
        resource: RES.ENEMIES,
        frames: ['snake_south_1', 'snake_south_2'],
        fps: 2,
    },

    RAT_WALK: {
        resource: RES.ENEMIES,
        frames: ['rat_south_1', 'rat_south_2'],
        fps: 2,
    },

    SCORPION_WALK: {
        resource: RES.ENEMIES,
        frames: ['scorpion_south_1', 'scorpion_south_2'],
        fps: 2,
    },

    PLAYER1_WALK: {
        resource: RES.FEMALE_MELEE,
        frames: ['melee1_south_1', 'melee1_south_2', 'melee1_south_3'],
        fps: 10,
    },

    PLAYER2_WALK: {
        resource: RES.FEMALE_MELEE,
        frames: ['melee2_south_1', 'melee2_south_2', 'melee2_south_3'],
        fps: 10,
    },

    PLAYER3_WALK: {
        resource: RES.FEMALE_MELEE,
        frames: ['melee3_south_1', 'melee3_south_2', 'melee3_south_3'],
        fps: 10,
    },

    SKEL_WARRIOR_WALK: {
        resource: RES.ENEMIES,
        frames: ['skeleton_warrior_south_2', 'skeleton_warrior_south_3'],
        fps: 4,
    },

    GOBLIN_WALK: {
        resource: RES.ENEMIES,
        frames: ['goblin_south_2', 'goblin_south_3'],
        fps: 6,
    },

    BAT_FLYING: {
        resource: RES.ENEMIES,
        frames: ['bat_south_1', 'bat_south_2'],
        fps: 4,
    },

    GATE_OPENING: {
        resource: RES.MAP_OBJS,
        frames: ['gate_wall_1', 'gate_wall_2', 'gate_wall_3'],
        fps: 2,
        looping: false,
    },
    
    GATE_CLOSING: {
        resource: RES.MAP_OBJS,
        frames: ['gate_wall_3', 'gate_wall_2', 'gate_wall_1'],
        fps: 3,
        looping: false,
    },

    DOOR_OPENING: {
        resource: RES.MAP_OBJS,
        frames: ['door1', 'door2', 'door3', 'door4'],
        fps: 2,
        looping: false,
    },
    
    DOOR_CLOSING: {
        resource: RES.MAP_OBJS,
        frames: ['door4', 'door3', 'door2', 'door1'],
        fps: 3,
        looping: false,
    },
    
};

