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

import * as PIXI from 'pixi.js';

export var RES = {
    MALE_MELEE: 'assets/media/rogue-like-8x8/Male-Melee.json',
    FEMALE_MELEE: 'assets/media/rogue-like-8x8/Girl-Melee.json',
    NPC_TILESET: 'assets/media/rogue-like-8x8/NPC.json',
    MAPTILES: 'assets/media/rogue-like-8x8/Tileset2.json',
    ENEMIES: 'assets/media/rogue-like-8x8/Enemies.json',
    WEAPONS: 'assets/media/rogue-like-8x8/Weapons.json',
    GROUND_ITEMS: 'assets/media/rogue-like-8x8/GroundItems.json',
    UI: 'assets/media/rogue-like-8x8/UI.json',
    // DRAGON: 'assets/media/rogue-like-8x8/Dragon.json',
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
};


export var ANIM = {
    SNAKE_WALK: {
        resource: RES.ENEMIES,
        frames: ['enemy_snake_south_1', 'enemy_snake_south_2'],
        fps: 2,
    },

    RAT_WALK: {
        resource: RES.ENEMIES,
        frames: ['enemy_rat_south_1', 'enemy_rat_south_2'],
        fps: 2,
    },

    SCORPION_WALK: {
        resource: RES.ENEMIES,
        frames: ['enemy_scorpion_south_1', 'enemy_scorpion_south_2'],
        fps: 2,
    },

    PLAYER1_WALK: {
        resource: RES.FEMALE_MELEE,
        frames: ['girl_melee1_south_1', 'girl_melee1_south_2', 'girl_melee1_south_3'],
        fps: 10,
    },

    PLAYER2_WALK: {
        resource: RES.FEMALE_MELEE,
        frames: ['girl_melee2_south_1', 'girl_melee2_south_2', 'girl_melee2_south_3'],
        fps: 10,
    },

    PLAYER3_WALK: {
        resource: RES.FEMALE_MELEE,
        frames: ['girl_melee3_south_1', 'girl_melee3_south_2', 'girl_melee3_south_3'],
        fps: 10,
    },

    SKEL_WARRIOR_WALK: {
        resource: RES.ENEMIES,
        frames: ['enemy_skeleton_warrior_south_2', 'enemy_skeleton_warrior_south_3'],
        fps: 4,
    },

    GOBLIN_WALK: {
        resource: RES.ENEMIES,
        frames: ['enemy_goblin_south_2', 'enemy_goblin_south_3'],
        fps: 6,
    },

    BAT_FLYING: {
        resource: RES.ENEMIES,
        frames: ['enemy_bat_south_1', 'enemy_bat_south_2'],
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

export const TILE_WIDTH = 8;
export const TILE_HEIGHT = 8;


export class Resources {
    static shared: Resources;

    constructor(private bundle: any) {}

    getFrame(res: string, name: string) {
        const textures = this.getTextures(res);
        if (!textures) {
            console.error('cannot find textures:', res);
        }
        const texture = textures[name];
        if (!texture) {
            console.error(`cannot find texture: ${name} (in ${res})`);
        }
        return texture;
    }

    getFrames(res: string, names: string) {
        let frames: any = [];
        for (let n = 0; n < names.length; n++) {
            let frame = this.getTextures(res)[names[n]];
            if (!frame) console.log('ERROR: missing frame ' + names[n]);
            frames.push(frame);
        }
        return frames;
    }

    getTextures(res: string) {
        if (!res) {
            throw Error('must specify a resource');
        }
        return this.bundle[res].textures;
    }

    static async load(): Promise<Resources> {
        function makeBundle(paths) {
            return {
                name: 'apdungeon',
                assets: paths.map(path => {
                    return {
                        name: path,
                        srcs: path,
                    }
                })
            }
        }
        PIXI.Assets.init({
            manifest: {
                bundles: [
                    makeBundle(Object.values(RES))
                ],
            }
        });
        const bundle = await PIXI.Assets.loadBundle('apdungeon');
        Resources.shared = new Resources(bundle);
        return Resources.shared;
    }
}
