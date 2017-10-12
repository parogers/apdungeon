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

var RES = require("./res");
var Render = require("./render");
var ProgressBar = require("./progress");
var GameControls = require("./controls");
var LevelScreen = require("./levelscreen");
var GameState = require("./gamestate");
var Utils = require("./utils");
//require("./contrib/sound.js");

var gamestate = null;
var stage = null;
var progress = null;

/* TODO - the game is implemented as a big loop where 'update' is called on
 * the level every iteration before painting the screen. (in term the level
 * calls 'update' on all things in the level, plus arena controllers, etc.
 * This could be better implemented as an event loop, where things queue
 * up events for callback later, issue broadcast events etc. This has the
 * benefit where entities that don't need to do anything (eg blood spatter),
 * or objects waiting for a trigger (eg door) don't waste processor time */

var lastCheck = 0;
var fps = 0;
var lastTime = null;
function gameLoop()
{
    var now = (new Date()).getTime()/1000.0;
    var dt = 0;
    if (lastTime) {
        var dt = Math.min(1.0/30, now - lastTime);
        //dt /= 4;
    }
    lastTime = now;

    fps++;
    if (now-lastCheck >= 2) {
        //console.log(fps/(now-lastCheck));
        lastCheck = now;
        fps = 0;
    }

    gamestate.update(dt);
    GameControls.update();
    gamestate.render();
    requestAnimationFrame(gameLoop)
}

function graphicsLoaded()
{
    sounds.whenLoaded = audioLoaded;
    sounds.onFailed = function(source) {
        console.log("Failed to load audio file: " + source);
    };
    // Show and update the new progress bar for loading audio
    progress.setText("LOADING AUDIO...");
    sounds.onProgress = function(percent) {
        progress.update(percent/100.0);
        requestAnimationFrame(function() {
            Render.getRenderer().render(stage);
        });
    };
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
        RES.GAME_MUSIC
    ]);
}

function audioLoaded()
{
    /* TODO - error handling here */
    setup();
}

function setup()
{
    for (name in PIXI.loader.resources) 
    {
        var err = PIXI.loader.resources[name].error;
        if (err) {
            console.log("Failed to load image: " + name + " (" + err + ")");
        }
    }
    stage.children = [];
    requestAnimationFrame(gameLoop)
}

module.exports = {};
module.exports.start = function(elementName)
{
    var div = document.getElementById(elementName);
    div.focus();

    // Use the level screen to determine what the render view aspect
    // ratio should be.
    Render.configure(div, LevelScreen.getAspectRatio());

    stage = new PIXI.Container();
    progress = new ProgressBar(200, 20, "LOADING IMAGES...");
    progress.sprite.x = 100;
    progress.sprite.y = 100;
    stage.addChild(progress.sprite);

    GameControls.configure();

    gamestate = new GameState();

    function progresscb(loader, resource) {
        console.log("loading: " + resource.url + 
                    " (" + (loader.progress|0) + "%)"); 
        progress.update(loader.progress/100.0);
        requestAnimationFrame(function() {
            Render.getRenderer().render(stage);
        });
    }
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
        .add(RES.DRAGON)
    //.add({name: "hit", url: "media/hit.wav"})
        .on("progress", progresscb)
        .load(graphicsLoaded);
}

module.exports.resize = function()
{
    gamestate.handleResize();
}

module.exports.getGamestate = function()
{
    return gamestate;
}
