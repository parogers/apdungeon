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
import { sound } from '@pixi/sound';
import { RES } from './res';
import { Render } from './render';
import { ProgressBar } from './progress';
import { GameControls } from './controls';
import { LevelScreen } from './levelscreen';
import { GameState } from './gamestate';
import { Utils } from './utils';
// import { ChunkLoaderPlugin, TilesetLoaderPlugin } from './bg';
import { GestureManager } from './gesture';

import { ChunkTemplate, Tileset } from './bg';

/* TODO - the game is implemented as a big loop where 'update' is called on
 * the level every iteration before painting the screen. (in term the level
 * calls 'update' on all things in the level, plus arena controllers, etc.
 * This could be better implemented as an event loop, where things queue
 * up events for callback later, issue broadcast events etc. This has the
 * benefit where entities that don't need to do anything (eg blood spatter),
 * or objects waiting for a trigger (eg door) don't waste processor time */

export class Game
{
    constructor(element, requestAnimationFrame)
    {
        this.requestAnimationFrame = requestAnimationFrame;
        this.element = element;
        this.lastCheck = 0;
        this.fps = 0;
        this.lastTime = null;

        this.gamestate = null;
        this.stage = null;
        this.progress = null;

        // PIXI.Assets.loader.registerPlugin(new ChunkLoaderPlugin());
        // PIXI.Assets.loader.registerPlugin(new TilesetLoaderPlugin());
    }

    resize() {
        if (this.gamestate) {
            this.gamestate.handleResize();
        }
    }

    gameloop()
    {
        let now = (new Date()).getTime()/1000.0;
        let dt = 0;
        if (this.lastTime !== null) {
            dt = Math.min(1.0/30, now - this.lastTime);
            //dt /= 4;
        }
        this.lastTime = now;

        this.fps++;
        if (now-this.lastCheck >= 2) {
            //console.log(fps/(now-lastCheck));
            this.lastCheck = now;
            this.fps = 0;
        }

        this.gamestate.update(dt);
        GameControls.update(dt);
        this.gamestate.render();
        this.requestAnimationFrame(() => {
            this.gameloop()
        });
    }

    progressCallback(progress)
    {
        // console.log('loading: ' + resource.url +
        //             ' (' + (loader.progress|0) + '%)');
        this.progress.update(progress/100.0);
        // this.requestAnimationFrame(() => {
        //     Render.getRenderer().render(this.stage);
        // });
    }

    start() {
        Render.configure(this.element, LevelScreen.getAspectRatio());
        this.gestureMgr = new GestureManager();
        this.gestureMgr.attach(Render.getRenderer().view);
        this.gestureMgr.gestureCallback = (gesture) => {
            this.gamestate.handleGesture(gesture);
        };

        // this.stage = new PIXI.Container();
        // this.progress = new ProgressBar(200, 20, 'LOADING IMAGES...');
        // this.progress.sprite.x = 100;
        // this.progress.sprite.y = 100;
        // this.stage.addChild(this.progress.sprite);

        loadAssets().then((bundle) => {
            window.assetsBundle = bundle;

            bundle.chunks = {};
            for (let name in bundle[RES.CHUNKS])
            {
                bundle.chunks[name] = new ChunkTemplate(
                    bundle[RES.CHUNKS][name].background,
                    bundle[RES.CHUNKS][name].midground,
                    bundle[RES.CHUNKS][name].things,
                );
            }

            bundle.tileset = new Tileset(
                bundle[RES.TILESET].tile_width,
                bundle[RES.TILESET].tile_height,
                bundle[RES.TILESET].tiles
            );

            GameControls.configure();

            this.gamestate = new GameState();
            this.stage = new PIXI.Container();
            this.stage.children = [];
            this.requestAnimationFrame(() => {
                this.gameloop()
            });
        });
    }
}

function loadAssets(progressCB)
{
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
                makeBundle([
                    RES.MALE_MELEE,
                    RES.FEMALE_MELEE,
                    RES.NPC_TILESET,
                    RES.MAPTILES,
                    RES.ENEMIES,
                    RES.WEAPONS,
                    RES.GROUND_ITEMS,
                    RES.UI,
                    RES.CHUNKS,
                    RES.TILESET,
                    RES.MAP_OBJS,
                    RES.GATE_SND,
                    RES.ARROW_DING_SND,
                    RES.ATTACK_SWORD_SND,
                    RES.HIT_SND,
                    RES.SNAKE_HURT_SND,
                    RES.DEAD_SND,
                    RES.SPLASH_SND,
                    RES.GO_SND,
                    RES.COIN_SND,
                    RES.DROP_SND,
                    RES.POWERUP1_SND,
                    RES.POWERUP2_SND,
                    RES.POWERUP3_SND,
                    RES.POWERUP4_SND,
                    RES.CHEST_SND,
                    RES.GAME_MUSIC,
                    // RES.DRAGON,
                ])
            ],
        }
    });
    return PIXI.Assets.loadBundle('apdungeon', progressCB);
}
