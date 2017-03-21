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
TILESET = "media/rogue-like-8x8/Tileset.json"
ENEMIES = "media/rogue-like-8x8/Enemies.json"
WEAPONS = "media/rogue-like-8x8/Weapons.json"

ATTACK_SWORD_SND = "media/effects/attack_sword2.wav"
HIT_SND = "media/effects/hit.wav"

SCALE = 5;

TILE_WIDTH = 8;
TILE_HEIGHT = 8;

var tileset = new Tileset();
var renderer = null;
var stage = null;
var camera = null;

function Camera()
{
    this.x = 0;
    this.y = 0;
    this.width = 0;
    this.height = 0;
}

function getTextures(res)
{
    return PIXI.loader.resources[res].textures;
}

function loaded()
{
    var div = document.getElementById("canvas_area");

    PIXI.settings.SCALE_MODE = PIXI.SCALE_MODES.NEAREST    

    renderer = PIXI.autoDetectRenderer(800, 500);
    div.appendChild(renderer.view);
    stage = new PIXI.Container();
    //stage.x = -100;

    controls = new GameControls();
    controls.attach();

    function progresscb(loader, resource) {
	console.log("loading: " + resource.url + 
		    "(" + loader.progress + "%)"); 
    }
    PIXI.loader
	.add(MALE_MELEE)
	.add(FEMALE_MELEE)
	.add(NPC)
	.add(TILESET)
	.add(ENEMIES)
	.add(WEAPONS)
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

    //camera.x = player.spriteContainer.x-100;

    stage.x = -camera.x;
    stage.y = -camera.y;
    camera.width = renderer.width;
    camera.height = renderer.height;

    if (lastTime) {
	var dt = now - lastTime;
	player.update(dt);
	snake.update(dt);
    }
    lastTime = now;

    stage.children.sort(function(s1, s2) {
	var z1 = s1.zpos || s1.y;
	var z2 = s2.zpos || s2.y;
	return z1-z2;
    });

    fps++;
    if (now-lastCheck >= 2) {
	console.log(fps/(now-lastCheck));
	lastCheck = now;
	fps = 0;
    }

    controls.update();
    renderer.render(stage);
    requestAnimFrame(gameLoop)
}

function create_grid(rows, cols)
{
    var grid = [];
    grid.rows = rows;
    grid.cols = cols;
    for (var row = 0; row < rows; row++) {
	grid[row] = [];
	for (var col = 0; col < cols; col++) {
	    grid[row][col] = "";
	}
    }
    return grid;
}

function generate_level()
{
    /* Generate the floor */
    var length = 50;
    var grid = create_grid(5, length);
    for (var row = 0; row < grid.rows; row++) {
	for (var col = 0; col < grid.cols; col++) {
	    var n = Math.random();
	    if (n < 0.5) grid[0][col] = "brick_wall_m";
	    else if (n < 0.8) grid[0][col] = "mossy_wall_m";
	    else grid[0][col] = "broken_wall_m";
	    grid[row][col] = "smooth_floor_m";
	}
    }

    var w = randint(4, 8);
    var pos = randint(2, grid.cols-2-w);
    for (var row = 1; row < grid.rows; row++)
	for (var col = pos-randint(0,2); col < pos+w+randint(0,2); col++)
	    grid[row][col] = "water";

    var pos = 0;
    while (true) 
    {
	nextpos = pos + randint(5, 10);
	if (nextpos >= grid.cols) break;

	if (Math.random() < 0.5) {
	    grid[0][randint(pos+1, nextpos-1)] = "gate_wall_1";
	}

	pos = nextpos;

	var w = 1;
	if (Math.random() < 0.5) {
	    w = randint(2, 4);
	}
	if (pos+w >= grid.cols) w = 0;

	var depth = randint(1, 2);
	for (var col = 0; col < w; col++) {
	    for (var row = 0; row < depth; row++) {
		if (row == 0) grid[row][pos+col] = "wall_behind";
		else grid[row][pos+col] = "wall_behind2";
	    }
	    grid[depth][pos+col] = "smooth_wall_m";
	}
	pos += w;
    }

    bg = new TiledBackground(TILE_WIDTH, TILE_HEIGHT, grid);
    bg.zpos = -1;
    stage.addChild(bg.sprite);
}

function graphicsLoaded()
{
    /* TODO - error handling here */
    sounds.load([
	ATTACK_SWORD_SND
    ]);
    sounds.whenLoaded = audioLoaded;
}

function audioLoaded()
{
    /* TODO - error handling here */
    setup();
}

function setup()
{
    var err = PIXI.loader.resources[ENEMIES].error;
    if (err) {
	console.log("ERROR " + err);
    }

    tex = PIXI.loader.resources[TILESET].textures;

    camera = new Camera();

    /* Generate the level */
    generate_level();

    snake = new Snake();
    snake.spawn();
    snake.sprite.x = 100;
    snake.sprite.y = 200;
    stage.addChild(snake.sprite);

    /* Add some demo stuff */
    melee = PIXI.loader.resources[FEMALE_MELEE].textures;
    player = new Player();
    player.spriteChar.texture = melee["melee1_south_1"];
    player.sprite.x = 150;
    player.sprite.y = 150;
    stage.addChild(player.sprite);

    weapons = PIXI.loader.resources[WEAPONS].textures;
    player.weaponSprite.texture = weapons["sword2"]

    player.waterSprite.texture = tex["treading_water"];

    melee = PIXI.loader.resources[MALE_MELEE].textures;
    var sprite = new PIXI.Sprite(melee["melee3_south_1"]);
    sprite.x = 100;
    sprite.y = 140;
    sprite.anchor.set(0.5, 1);
    sprite.scale.set(SCALE);
    stage.addChild(sprite);

    npc = PIXI.loader.resources[NPC].textures;
    var sprite = new PIXI.Sprite(npc["npc1_south_1"]);
    sprite.x = 200;
    sprite.y = 160;
    sprite.anchor.set(0.5, 1);
    sprite.scale.set(SCALE);
    stage.addChild(sprite);

    requestAnimFrame(gameLoop)
}
