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

import { RES } from './res';
import { Render } from './render';
import { ProgressBar } from './progress';
import { GameControls } from './controls';
import { LevelScreen } from './levelscreen';
import { GameState } from './gamestate';
import { Utils } from './utils';
import { ChunkLoaderPlugin, TilesetLoaderPlugin } from './bg';
import { GestureManager } from './gesture';

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

        PIXI.Loader.registerPlugin(new ChunkLoaderPlugin());
        PIXI.Loader.registerPlugin(new TilesetLoaderPlugin());
    }

    resize() {
        this.gamestate.handleResize();
    }

    gameloop()
    {
        var now = (new Date()).getTime()/1000.0;
        var dt = 0;
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

    progressCallback(loader, resource)
    {
        console.log("loading: " + resource.url + 
                    " (" + (loader.progress|0) + "%)"); 
        this.progress.update(loader.progress/100.0);
        this.requestAnimationFrame(() => {
            Render.getRenderer().render(this.stage);
        });
    }

    start()
    {
        this.element.focus();

        // Use the level screen to determine what the render view aspect
        // ratio should be.
        Render.configure(this.element, LevelScreen.getAspectRatio());

        this.gestureMgr = new GestureManager();
        this.gestureMgr.attach(Render.getRenderer().view);
        this.gestureMgr.gestureCallback = (gesture) => {
            this.gamestate.handleGesture(gesture);
        };

        this.stage = new PIXI.Container();
        /*this.progress = new ProgressBar(200, 20, "LOADING IMAGES...");
        this.progress.sprite.x = 100;
        this.progress.sprite.y = 100;
        this.stage.addChild(this.progress.sprite);*/

        function progress(loader, resource) {
            //this.progressCallback(loader, resource);
        }

        GameControls.configure();
        this.gamestate = new GameState();

        Promise.all([
            loadGraphics(progress),
            loadAudio(progress)

        ]).then(() => {
            // Render the chunks (now that the map tiles are loaded)
            let chunks = PIXI.loader.resources[RES.CHUNKS].chunks;
            for (let name in chunks) {
                chunks[name].renderTexture();
            }

        }).then(() => {
            console.log('done loading audio');

            for (name in PIXI.loader.resources) 
            {
                var err = PIXI.loader.resources[name].error;
                if (err) {
                    console.log("Failed to load image: " + name + " (" + err + ")");
                }
            }
            this.stage.children = [];
            this.requestAnimationFrame(() => {
                this.gameloop()
            });

        });
        /* TODO - error handling here */
    }
}

// Returns a promise that resolves when all graphics resources are loaded
function loadGraphics(progressCB)
{
    return new Promise((resolve, reject) => {
        // Add a random query string when loading the JSON files below. This avoids
        // persistent caching problems, where the browser (eg FF) uses the cached
        // without checking in with the server first.
        var now = (new Date()).getTime();
        PIXI.loader.defaultQueryString = "nocache=" + now;
        PIXI.loader
            .add(RES.MALE_MELEE)
            .add(RES.FEMALE_MELEE)
            .add(RES.NPC_TILESET)
            .add(RES.MAPTILES)
            .add(RES.ENEMIES)
            .add(RES.WEAPONS)
            .add(RES.GROUND_ITEMS)
            .add(RES.UI)
            .add(RES.CHUNKS)
            .add(RES.TILESET)
            .add(RES.MAP_OBJS)
            //.add(RES.DRAGON)
            //.add({name: "hit", url: "media/hit.wav"})
            .on("progress", progressCB)
            .load(resolve);
    });
}

function loadAudio(progressCB)
{
    return new Promise((resolve, reject) => {
        sounds.whenLoaded = function() {
            resolve();
        };
        sounds.onFailed = function(source) {
            console.log("Failed to load audio file: " + source);
            reject();
        };
        // Show and update the new progress bar for loading audio
        //this.progress.setText("LOADING AUDIO...");
        /*sounds.onProgress = (percent) => {
            this.progress.update(percent/100.0);
            requestAnimationFrame(() => {
                Render.getRenderer().render(this.stage);
            });
        };*/
        sounds.load([
            RES.ATTACK_SWORD_SND,
            RES.SNAKE_HURT_SND,
            RES.DEAD_SND,
            RES.ARROW_DING_SND,
            RES.SPLASH_SND,
            RES.GO_SND,
            RES.HIT_SND,
            RES.COIN_SND,
            RES.GATE_SND,
            RES.DROP_SND,
            RES.POWERUP1_SND,
            RES.POWERUP2_SND,
            RES.POWERUP3_SND,
            RES.POWERUP4_SND,
            RES.CHEST_SND,
            //RES.GAME_MUSIC
        ]);
    });
}
