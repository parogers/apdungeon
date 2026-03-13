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
    NPC_TILESET: 'media/rogue-like-8x8/NPC.json',
    WEAPONS: 'media/sprites/weapons.json',
    GROUND_ITEMS: 'media/sprites/ground-items.json',
    UI: 'media/rogue-like-8x8/UI.json',
    // DRAGON: 'media/rogue-like-8x8/Dragon.json',
    MAP_OBJS: 'media/rogue-like-8x8/MapObjects.json',
    PLAYER: 'media/sprites/player.json',
    ENEMIES: 'media/sprites/enemies.json',

    GAME_MUSIC: 'media/music/A Journey Awaits2-lowfi.ogg',
    ATTACK_SWORD_SND: 'media/effects/attack_sword2.wav',
    HIT_SND: 'media/effects/hit.wav',
    SNAKE_HURT_SND: 'media/effects/snake_hurt.wav',
    DEAD_SND: 'media/effects/dead.wav',
    SPLASH_SND: 'media/effects/splash.wav',
    ARROW_DING_SND: 'media/effects/arrow_ding.wav',
    GO_SND: 'media/effects/go.wav',
    COIN_SND: 'media/effects/coin.wav',
    GATE_SND: 'media/effects/gate.wav',
    DROP_SND: 'media/effects/drop.wav',
    POWERUP1_SND: 'media/effects/powerup1.wav',
    POWERUP2_SND: 'media/effects/powerup2.wav',
    POWERUP3_SND: 'media/effects/powerup3.wav',
    POWERUP4_SND: 'media/effects/powerup4.wav',
    CHEST_SND: 'media/effects/chest_open.wav',
    TILES_DIRT: 'tiles-dirt.json',
    TILES_GRASS: 'tiles-grass.json',
};


export var ANIM = {
    SNAKE_WALK: {
        resource: RES.ENEMIES,
        frames: ['enemy-snake-walk1', 'enemy-snake-walk2'],
        fps: 2,
    },

    RAT_WALK: {
        resource: RES.ENEMIES,
        frames: ['enemy_rat_south_1', 'enemy_rat_south_2'],
        fps: 2,
    },

    SCORPION_WALK: {
        frames: ['enemy-scorpion-walk1', 'enemy-scorpion-walk2'],
        fps: 5,
    },

    PLAYER1_NORTH_WALK: {
        frames: ['girl-melee1-north-idle', 'girl-melee1-north-walk1', 'girl-melee1-north-walk2'],
        fps: 10,
    },
    PLAYER1_SOUTH_WALK: {
        frames: ['girl-melee1-idle', 'girl-melee1-walk1', 'girl-melee1-walk2'],
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

export type TextureMap = { [name: string]: PIXI.Texture };


/* Extracts the textures from the given PIXI bundle and returns them as a map
 * keyed by texture name. */
function getTexturesByName(bundle: any): TextureMap {
    const results = Object.values(bundle)
        .filter((asset: any) => asset && !!asset['textures'])
        .map((asset: any) => {
            return Object.keys(asset.textures).map((name) => {
                return [name, asset.textures[name]];
            });
        });
    return Object.fromEntries(results.flat());
}


export class Resources {
    static shared: Resources;
    texturesByName: TextureMap;

    constructor(private bundle: any) {
        this.texturesByName = getTexturesByName(bundle);
    }

    getFrame(name: string) {
        const texture = this.texturesByName[name];
        if (!texture) {
            console.error(`cannot find texture: ${name}`);
        }
        return texture;
    }

    getFrames(names: string) {
        const frames: any = [];
        for (let n = 0; n < names.length; n++) {
            const frame = this.texturesByName[names[n]];
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

    find(res: string) {
        const obj = this.bundle[res];
        if (!obj) {
            throw Error(`cannot find resource: ${res}`);
        }
        return obj;
    }

    static async load(): Promise<Resources> {
        function makeBundle(paths) {
            return {
                name: 'apdungeon',
                assets: paths.map(path => {
                    return {
                        alias: path,
                        src: path,
                    }
                })
            }
        }
        const bundleDef = makeBundle(Object.values(RES));
        PIXI.Assets.init({
            manifest: {
                bundles: [
                    bundleDef,
                ],
            }
        });
        const bundle = await PIXI.Assets.loadBundle('apdungeon');
        Resources.shared = new Resources(bundle);
        return Resources.shared;
    }
}
