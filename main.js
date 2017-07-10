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

MALE_MELEE = "media/rogue-like-8x8/Male-Melee.json"
FEMALE_MELEE = "media/rogue-like-8x8/Girl-Melee.json"
NPC_TILESET = "media/rogue-like-8x8/NPC.json"
MAPTILES = "media/rogue-like-8x8/Tileset.json"
ENEMIES = "media/rogue-like-8x8/Enemies.json"
WEAPONS = "media/rogue-like-8x8/Weapons.json"
GROUND_ITEMS = "media/rogue-like-8x8/GroundItems.json"
UI = "media/rogue-like-8x8/UI.json"
DRAGON = "media/rogue-like-8x8/Dragon.json"

GAME_MUSIC = "media/music/A Journey Awaits2.ogg"
ATTACK_SWORD_SND = "media/effects/attack_sword2.wav"
HIT_SND = "media/effects/hit.wav"
SNAKE_HURT_SND = "media/effects/snake_hurt.wav"
DEAD_SND = "media/effects/dead.wav"
SPLASH_SND = "media/effects/splash.wav"
ARROW_DING_SND = "media/effects/arrow_ding.wav"
GO_SND = "media/effects/go.wav"
COIN_SND = "media/effects/coin.wav"
GATE_SND = "media/effects/gate.wav"
DROP_SND = "media/effects/drop.wav"
POWERUP1_SND = "media/effects/powerup1.wav"
POWERUP2_SND = "media/effects/powerup2.wav"
POWERUP3_SND = "media/effects/powerup3.wav"
POWERUP4_SND = "media/effects/powerup4.wav"
CHEST_SND = "media/effects/chest_open.wav"

SCALE = 5;

TILE_WIDTH = 8;
TILE_HEIGHT = 8;
WALL_HEIGHT = 13;

// Currently playing music
var music = null;
var tileset = new Tileset();
var level = null;
var renderer = null;
var stage = null;
var progress = null;
var gamestate = null;

function loaded()
{
    var div = document.getElementById("canvas_area");
    div.focus();

    PIXI.settings.SCALE_MODE = PIXI.SCALE_MODES.NEAREST    

    renderer = PIXI.autoDetectRenderer(550, 400);
    div.appendChild(renderer.view);
    stage = new PIXI.Container();

    progress = new ProgressBar(200, 20, "LOADING IMAGES...");
    progress.sprite.x = 100;
    progress.sprite.y = 100;
    stage.addChild(progress.sprite);

    controls = new GameControls();
    controls.attach();

    gamestate = new GameState();

    function progresscb(loader, resource) {
	console.log("loading: " + resource.url + 
		    " (" + (loader.progress|0) + "%)"); 
	progress.update(loader.progress/100.0);
	requestAnimFrame(function() {
	    renderer.render(stage);
	});
    }
    // Add a random query string when loading the JSON files below. This avoids
    // persistent caching problems, where the browser (eg FF) uses the cached
    // without checking in with the server first.
    var now = (new Date()).getTime();
    PIXI.loader.defaultQueryString = "nocache=" + now;
    PIXI.loader
	.add(MALE_MELEE)
	.add(FEMALE_MELEE)
	.add(NPC_TILESET)
	.add(MAPTILES)
	.add(ENEMIES)
	.add(WEAPONS)
	.add(GROUND_ITEMS)
	.add(UI)
	.add(DRAGON)
	//.add({name: "hit", url: "media/hit.wav"})
	.on("progress", progresscb)
	.load(graphicsLoaded);
}

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
    controls.update();
    gamestate.render();
    requestAnimFrame(gameLoop)
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
	requestAnimFrame(function() {
	    renderer.render(stage);
	});
    };
    sounds.load([
	ATTACK_SWORD_SND,
	SNAKE_HURT_SND,
	DEAD_SND,
	ARROW_DING_SND,
	SPLASH_SND,
	GO_SND,
	COIN_SND,
	GATE_SND,
	DROP_SND,
	POWERUP1_SND,
	POWERUP2_SND,
	POWERUP3_SND,
	POWERUP4_SND,
	CHEST_SND,
	GAME_MUSIC
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

    //stage.removeChild(progress.sprite);
    stage.children = [];

    var screen = new LevelScreen();
    screen.startGame();

    gamestate.screen = screen;

    music = sounds[GAME_MUSIC];
    music.loop = true;
    music.volume = 0.5;
    music.play();

    requestAnimFrame(gameLoop)
}
