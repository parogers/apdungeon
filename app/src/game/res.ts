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
    MALE_MELEE: "assets/media/rogue-like-8x8/Male-Melee.json",
    FEMALE_MELEE: "assets/media/rogue-like-8x8/Girl-Melee.json",
    NPC_TILESET: "assets/media/rogue-like-8x8/NPC.json",
    MAPTILES: "assets/media/rogue-like-8x8/Tileset.json",
    ENEMIES: "assets/media/rogue-like-8x8/Enemies.json",
    WEAPONS: "assets/media/rogue-like-8x8/Weapons.json",
    GROUND_ITEMS: "assets/media/rogue-like-8x8/GroundItems.json",
    UI: "assets/media/rogue-like-8x8/UI.json",
    //DRAGON: "assets/media/rogue-like-8x8/Dragon.json",

    GAME_MUSIC: "assets/media/music/A Journey Awaits2-lowfi.ogg",
    ATTACK_SWORD_SND: "assets/media/effects/attack_sword2.wav",
    HIT_SND: "assets/media/effects/hit.wav",
    SNAKE_HURT_SND: "assets/media/effects/snake_hurt.wav",
    DEAD_SND: "assets/media/effects/dead.wav",
    SPLASH_SND: "assets/media/effects/splash.wav",
    ARROW_DING_SND: "assets/media/effects/arrow_ding.wav",
    GO_SND: "assets/media/effects/go.wav",
    COIN_SND: "assets/media/effects/coin.wav",
    GATE_SND: "assets/media/effects/gate.wav",
    DROP_SND: "assets/media/effects/drop.wav",
    POWERUP1_SND: "assets/media/effects/powerup1.wav",
    POWERUP2_SND: "assets/media/effects/powerup2.wav",
    POWERUP3_SND: "assets/media/effects/powerup3.wav",
    POWERUP4_SND: "assets/media/effects/powerup4.wav",
    CHEST_SND: "assets/media/effects/chest_open.wav",

    TILE_WIDTH: 8,
    TILE_HEIGHT: 8,
    WALL_HEIGHT: 13,

    renderer: null
};
