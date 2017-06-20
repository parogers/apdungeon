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
NPC = "media/rogue-like-8x8/NPC.json"
MAPTILES = "media/rogue-like-8x8/Tileset.json"
ENEMIES = "media/rogue-like-8x8/Enemies.json"
WEAPONS = "media/rogue-like-8x8/Weapons.json"
GROUND_ITEMS = "media/rogue-like-8x8/GroundItems.json"
UI = "media/rogue-like-8x8/UI.json"

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

function loaded()
{
    var div = document.getElementById("canvas_area");
    div.focus();

    PIXI.settings.SCALE_MODE = PIXI.SCALE_MODES.NEAREST    

    renderer = PIXI.autoDetectRenderer(600, 400);
    div.appendChild(renderer.view);
    stage = new PIXI.Container();

    progress = new ProgressBar(200, 20, "LOADING IMAGES...");
    progress.sprite.x = 100;
    progress.sprite.y = 100;
    stage.addChild(progress.sprite);

    controls = new GameControls();
    controls.attach();

    function progresscb(loader, resource) {
	console.log("loading: " + resource.url + 
		    "(" + loader.progress + "%)"); 
	progress.update(loader.progress/100.0);
	requestAnimFrame(function() {
	    renderer.render(stage);
	});
    }
    PIXI.loader
	.add(MALE_MELEE)
	.add(FEMALE_MELEE)
	.add(NPC)
	.add(MAPTILES)
	.add(ENEMIES)
	.add(WEAPONS)
	.add(GROUND_ITEMS)
	.add(UI)
	//.add({name: "hit", url: "media/hit.wav"})
	.on("progress", progresscb)
	.load(graphicsLoaded);
}

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

    level.update(dt);
    controls.update();
    level.render();
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

    /* Generate the level */
    level = generateLevel();

    /* Add some demo stuff */
    player = new Player();
    player.sprite.x = 250;
    player.sprite.y = 200;
    level.addThing(player);

    /*var go = new GoMarker();
    go.sprite.x = 500;
    go.sprite.y = 100;
    level.addThing(go);*/

    /*var npc = new Scenery(getTextures(NPC)["npc1_south_1"]);
    npc.sprite.x = 200;
    npc.sprite.y = 160;
    level.addThing(npc);*/

    var items = [Item.SMALL_HEALTH, Item.LARGE_HEALTH, Item.ARROW, Item.COIN, Item.COIN, Item.COIN, Item.COIN, Item.COIN, Item.LEATHER_ARMOUR];
    var chest = new Chest(items);
    chest.sprite.x = 150;
    chest.sprite.y = 180;
    level.addThing(chest);

/*    var text = "100";
    textSprite = new PIXI.Text(
	text, {fontFamily: 'Courier New', 
	       fontSize: 10,
	       fill: 0xffffff,
	       fontWeight: 'bold'
	      });
    textSprite.x = 50;
    textSprite.y = 50;
    textSprite.scale.set(SCALE*0.25);
    level.guiStage.addChild(textSprite)*/

/*    var test = new Scenery(getFrame(UI, "5"));
    test.sprite.x = 50;
    test.sprite.y = 50;
    test.sprite.scale.set(SCALE*0.75);
    test.guiLayer = true;
    level.addThing(test);*/

    music = sounds[GAME_MUSIC];
    music.loop = true;
    music.volume = 0.5;
    music.play();

    requestAnimFrame(gameLoop)
}
