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

var Render = require("./render");
var UI = require("./ui");
var LevelGenerator = require("./genlevel");
var GoMarker = require("./gomarker");
var Player = require("./player");
var Level = require("./level");
var Utils = require("./utils");
var GameControls = require("./controls");

/***************/
/* LevelScreen */
/***************/

/* A container for holding screen-related stuff for playing a level. This
 * includes the level itself, PIXI container (staging area for rendering),
 * and the UI elements. (health bar, etc) */
function LevelScreen()
{
    // The various states this screen can be in
    this.NEW_GAME = 1;
    this.PLAYING = 2;
    this.NEXT_LEVEL = 3;
    this.GAME_OVER = 4;

    this.levelNum = 0;
    this.level = null;
    this.state = this.NEW_GAME;

    this.stage = new PIXI.Container();

    this.goMarker = new GoMarker(this);
    this.gameUI = new UI.GameUI();
    this.stage.addChild(this.goMarker.sprite);
    this.stage.addChild(this.gameUI.container);

    window.addEventListener("resize", function() {
        //div.style.width = window.innerWidth;
        //div.style.height = window.innerHeight;
        //Render.configure(div);
    });
}

LevelScreen.prototype.update = function(dt)
{
    switch(this.state) {
    case this.NEW_GAME:
        // Generate a new level and player character
        this.player = new Player(GameControls.getControls());
        this.player.sprite.x = 0;
        this.player.sprite.y = 0;
        this.levelNum = 0;
        // Generate the first level
        var level = LevelGenerator.generate(this.levelNum);
        this.setLevel(level);
        // Start playing it immediately
        this.state = this.PLAYING;
        // Start playing music (fade in). We call restart, which stops the
        // previously play (if any), rewinds and starts again.
        Utils.getMusic().restart();
        Utils.getMusic().fadeIn(1);
        break;

    case this.PLAYING:
        if (this.level.state === this.level.FINISHED) {
            // Proceed to the next level
            console.log("NEXT LEVEL");
            level = LevelGenerator.generate(++this.levelNum);
            this.setLevel(level);
        } else if (this.player.dead) {
            // This triggers the game state machine to advance to the game
            // over screen. Note there is no stop for sound effects, only 
            // a pause function. (TODO - why?)
            Utils.getMusic().pause();
            this.state = this.GAME_OVER;
        } else {
            if (this.level) this.level.update(dt);
            this.gameUI.update(dt);
            this.goMarker.update(dt);
        }
        break;

    case this.NEXT_LEVEL:
        break;

    case this.GAME_OVER:
        break;
    }
}

LevelScreen.prototype.render = function()
{
    if (this.level) {
        Render.getRenderer().render(this.stage);
    }
}

LevelScreen.prototype.setLevel = function(level)
{
    // Remove the previous level sprite container
    if (this.level) {
        this.stage.removeChild(this.level.stage);
    }
    if (!level) return;

    var scale = Math.min(
        Render.getRenderer().width / level.camera.width,
        Render.getRenderer().height / level.camera.height);

    // Revise the camera width to fill the available horizontal space
    //level.camera.width = Render.getRenderer().width / scale;

    this.stage.scale.set(scale);
    // Add the level (container) sprite to the start of the list of
    // child sprites, so it gets rendered before anything else.
    // (ie UI elements are drawn on top of the level)
    this.stage.addChildAt(level.stage, 0);
    this.level = level;

    this.gameUI.setPlayer(this.player);
    this.gameUI.doLayout(
        0, level.getHeight(),
        level.camera.width, 
        level.camera.height - level.getHeight());

    // Put the go marker in the top-right corner of the level area
    this.goMarker.sprite.x = level.camera.width-1;
    this.goMarker.sprite.y = 2;
    this.level.player = this.player;
    this.level.addThing(this.player);
    this.level.update(0);
}

module.exports = LevelScreen;
