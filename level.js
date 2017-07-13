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

BEHIND_BACKGROUND_POS = -1;
BACKGROUND_POS = 0;
FLOOR_POS = 1;
FRONT_POS = 10000;

/**********/
/* Hitbox */
/**********/

// A hitbox that defines an area of a thing to test collisions against. Note
// the (x, y) point is relative to the thing's sprite position, and (w, h)
// defines a rectangle that is centered on that position.
function Hitbox(x, y, w, h)
{
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
}

/**********/
/* Camera */
/**********/

function Camera()
{
    this.x = 0;
    this.y = 0;
    this.width = renderer.width;
    this.height = renderer.height;
}

/*********/
/* Level */
/*********/

// Helper function for sorting sprites by depth, so sprites in the backround
// are drawn below sprites in the foreground.
function compareDepth(s1, s2) {
    var z1 = s1.zpos || s1.y;
    var z2 = s2.zpos || s2.y;
    return (z1>z2) - (z2>z1);
}

function Level(bg)
{
    // The various level states:
    // Player is within an active arena
    this.ACTIVE_ARENA = 1;
    // Showing the go arrow, indicating the player should advance forward
    this.SHOWING_GO = 2;
    // Player is moving towards next arena (not active yet)
    this.NEXT_ARENA = 3;
    // All monsters defeated - exit is open
    this.EXIT_OPEN = 4;
    // Player has passed through the exit
    this.FINISHED = 5;

    this.camera = new Camera();
    this.player = null;
    this.stage = null;
    this.state = this.NEXT_ARENA;
    // The background sprite (TiledBackground)
    this.bg = bg;
    this.bg.zpos = BACKGROUND_POS;
    // List of enemies, interactable objects etc and the player
    this.things = [];
    // The PIXI container for everything we want to draw
    this.stage = new PIXI.Container();
    this.stage.addChild(this.bg.sprite);
    // List of arenas in this level (Arena instances)
    this.arenas = [];
    // Current active arena (number)
    this.arenaNum = 0;
    this.smoothTracking = true;
    this.exitDoor = null;
}

// Returns the width of the level in pixels (ie render size)
Level.prototype.getWidth = function()
{
    return this.bg.sprite.width;
}

// Returns the height of the level in pixels (ie render size)
Level.prototype.getHeight = function()
{
    return this.bg.sprite.height;
}

/* Find some clear space to spawn a thing at the given location. This code
 * looks up/down until it finds the first pixel of free space. Returns the
 * y-position of that free space. */
Level.prototype.findClearSpace = function(x, y)
{
    var offset = 0;
    while(true)
    {
	var north = this.bg.getTileAt(x, y + offset);
	var south = this.bg.getTileAt(x, y - offset);
	if (!north.solid) {
	    return y + offset;
	}
	if (!south.solid) {
	    return y - offset;
	}
	if (y + offset > this.getHeight() && y - offset < 0) {
	    // We've gone completely outside the level - no space found
	    return null;
	}
	offset += TILE_HEIGHT*SCALE;
    }
}

/* Adds an arena to this level. This function also maintains the correct
 * ordering of arenas sorted by ending position. */
Level.prototype.addArena = function(arena)
{
    this.arenas.push(arena);
    this.arenas.sort(function(a1, a2) {
	return (a1.endx > a2.endx) - (a2.endx > a1.endx);
    });
}

/* Called by the exit Door when the player walks through to the next level */
Level.prototype.triggerNextLevel = function()
{
    if (this.state === this.EXIT_OPEN) {
	console.log("NEXT LEVEL");
    }
}

// Called every frame to update the general level state
Level.prototype.update = function(dt)
{
    var arena = this.arenas[this.arenaNum];
    switch(this.state) {
    case this.ACTIVE_ARENA:
	// Wait for the current arena to be finished (ie player defeats 
	// all the monsters)
	if (arena.done) {
	    if (this.arenaNum < this.arenas.length-1) {
		// Show the "go forward" marker
		//gamestate.screen.goMarker.show();
		// Advance to the next arena
		this.arenaNum++;
		this.state = this.SHOWING_GO;
	    } else {
		// No more arenas - open the exit door
		this.state = this.EXIT_OPEN;
		if (this.exitDoor) this.exitDoor.startOpening();
	    }
	} else {
	    arena.update(dt);
	}
	// Update the camera - the player has full mobility within the 
	// start and stop bounds of the arena.
	var xpos = this.player.sprite.x - this.camera.width/2;
	xpos = Math.max(xpos, arena.startx);
	xpos = Math.min(xpos, arena.endx-this.camera.width);
	break;
	
    case this.SHOWING_GO:
	// Wait for the player to move the level forward by "pushing" the
	// edge of the screen.
	if (this.player.sprite.x > this.camera.x + this.camera.width*0.8) {
	    this.state = this.NEXT_ARENA;
	    this.smoothTracking = true;
	}
	break;

    case this.NEXT_ARENA:
	// Update the camera to track the player. Have the camera move
	// smoothly towards the player to avoid jumping around.
	var xpos = this.player.sprite.x - this.camera.width/2;
	xpos = Math.max(xpos, 0);
	xpos = Math.min(xpos, this.bg.sprite.width-this.camera.width);
	if (this.smoothTracking) {
	    var dirx = Math.sign(xpos-this.camera.x);
	    this.camera.x += dt*1.25*this.player.maxSpeed*dirx;
	    if (dirx != Math.sign(xpos-this.camera.x)) {
		// Overshot the target, stop smoothly tracking
		this.smoothTracking = false;
	    }
	} else {
	    this.camera.x = xpos;
	}

	// Also remove the go marker (if it's done animated) since the player
	// already knows to move forward by now.
	/*if (gamestate.screen.goMarker.sprite.visible && 
	    gamestate.screen.goMarker.done) {
	    gamestate.screen.goMarker.hide();
	}*/

	// Wait for the player to move into the next arena
	if (arena && this.camera.x + this.camera.width >= arena.endx-1)
	{
	    // Snap the camera into place and activate the next arena
	    this.camera.x = arena.endx - this.camera.width;
	    arena.activate();
	    this.state = this.ACTIVE_ARENA;
	    // If somehow the go marker is sticking around (maybe the player
	    // is moving _really_ fast) remove it now, done or not.
	    /*if (gamestate.screen.goMarker.sprite.visible) {
		gamestate.screen.goMarker.hide();
	    }*/
	}
	break;

    case this.EXIT_OPEN:
	break;

    }

    // TODO - this could be better optimized by despawning things that are
    // no longer visible. (ie blood spatters etc)

    // Re-sort the sprites by Z-depth so things are rendered in the correct
    // order.
    this.stage.children.sort(compareDepth);
    // Position the camera
    this.stage.x = -this.camera.x;
    this.stage.y = -this.camera.y;
    // Update everything in the level
    for (thing of this.things) {
	if (thing.update) thing.update(dt);
    }
}

/* Check if the given hitbox, at the given position, overlaps with any thing 
 * in the level. Can also supply a thing to ignore when making the check. 
 * This function is used to determine if a projectile strikes a target. */
Level.prototype.checkHit = function(x, y, hitbox, ignore)
{
    var xp = x + hitbox.x, yp = y + hitbox.y;
    var w = hitbox.w, h = hitbox.h;
    //var thing = null;
    //for (var n = 0; n < this.things.length; n++) 
    for (thing of this.things)
    {
	//thing = this.things[n];
	if (thing !== ignore && thing.sprite && 
	    thing.hitbox && thing.hitbox !== hitbox && 
	    Math.abs(xp-thing.sprite.x-thing.hitbox.x) < (w+thing.hitbox.w)/2 &&
	    Math.abs(yp-thing.sprite.y-thing.hitbox.y) < (h+thing.hitbox.h)/2)
	{
	    return thing;
	}
    }
    return null;
}

/* Returns a list of things that overlap with the given hitbox at a given
 * position within the level. (useful for checking if the player has collided
 * with any monsters) */
Level.prototype.checkHitMany = function(x, y, hitbox, ignore)
{
    var xp = x + hitbox.x, yp = y + hitbox.y;
    var w = hitbox.w, h = hitbox.h;
    //var thing = null;
    var hit = [];
    //for (var n = 0; n < this.things.length; n++) 
    for (thing of this.things)
    {
	//thing = this.things[n];
	if (thing !== ignore && thing.sprite && 
	    thing.hitbox && thing.hitbox !== hitbox && 
	    Math.abs(xp-thing.sprite.x-thing.hitbox.x) < (w+thing.hitbox.w)/2 &&
	    Math.abs(yp-thing.sprite.y-thing.hitbox.y) < (h+thing.hitbox.h)/2)
	{
	    hit.push(thing);
	}
    }
    return hit;
}

// Add a 'thing' to the level and it's sprite to the render stage
Level.prototype.addThing = function(thing)
{
    thing.level = this;
    this.things.push(thing);
    if (thing.sprite) {
	this.stage.addChild(thing.sprite);
    }
}

// Remove a 'thing' remove the level and it's sprite from the stage
Level.prototype.removeThing = function(thing)
{
    var i = this.things.indexOf(thing);
    if (i >= 0) {
	this.things[i] = this.things[this.things.length-1];
	this.things.pop();
	thing.level = null;
    }

    if (thing.sprite && thing.sprite.parent) {
	thing.sprite.parent.removeChild(thing.sprite);
    }
}

Level.prototype.handleTreasureDrop = function(table, x, y)
{
    // Pick an item entry from the table, using a weighted probability pick
    // Entries look like: [item_number, weight]. First sum all the weights
    // and pick a random number up to that total.
    var total = 0;
    for (entry of table) {
	total += entry[1];
    }
    // Pick a random number, then iterate over the items and find what 
    // item it corresponds to.
    var pick = null;
    var num = randint(0, total);
    for (entry of table) {
	num -= entry[1];
	if (num <= 0) {
	    pick = entry[0];
	    break;
	}
    }
    // Drop the item
    if (pick !== null) {
	var coin = spawnItem(pick, x, y);
	coin.velx = 50*(x > this.camera.x ? -1 : 1);
	coin.velh = -200;
    }
}

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

    this.level = null;
    this.state = this.NEW_GAME;

    this.stage = new PIXI.Container();

    this.healthUI = new HealthUI();
    this.inventoryUI = new InventoryUI();
    this.goMarker = new GoMarker();

    this.stage.addChild(this.healthUI.sprite);
    this.stage.addChild(this.inventoryUI.sprite);
    this.stage.addChild(this.goMarker.sprite);
}

LevelScreen.prototype.update = function(dt)
{
    switch(this.state) {
    case this.NEW_GAME:
	// Generate a new level and player character
	player = new Player();
	player.sprite.x = 250;
	player.sprite.y = 200;
	this.player = player;
	// Generate the first level
	level = LevelGenerator.generate(0);
	this.setLevel(level);
	// Start playing it immediately
	this.state = this.PLAYING;
	// Start playing music (fade in). We call restart, which stops the
	// previously play (if any), rewinds and starts again.
	music.restart();
	music.fadeIn(1);
	break;

    case this.PLAYING:
	if (this.level.state === this.level.FINISHED) {
	    // Proceed to the next level
	    // ...
	} else if (this.player.dead) {
	    // This triggers the game state machine to advance to the game
	    // over screen. Note there is no stop for sound effects, only 
	    // a pause function. (TODO - why?)
	    music.pause();
	    this.state = this.GAME_OVER;
	} else {
	    if (this.level) this.level.update(dt);
	    this.healthUI.update(dt);
	    this.inventoryUI.update(dt);
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
	renderer.render(this.stage);
    }
}

LevelScreen.prototype.setLevel = function(level)
{
    // Remove the previous level sprite container
    if (this.level) {
	this.stage.removeChild(this.level.stage);
    }
    if (level) 
    {
	this.stage.addChild(level.stage);
	// Move the level (container) sprite to the start of the list of
	// child sprites, so it gets rendered before anything else.
	// (ie UI elements are drawn on top of the level)
	this.stage.children.unshift(this.stage.children.pop());
	this.level = level;
	// Position the UI just below the level render area
	this.healthUI.sprite.x = renderer.width-1;
	this.healthUI.sprite.y = level.getHeight()-10;
	this.inventoryUI.sprite.x = 30;
	this.inventoryUI.sprite.y = level.getHeight()+15;
	// Put the go marker in the top-right corner of the level area
	this.goMarker.sprite.x = renderer.width - 10;
	this.goMarker.sprite.y = 10;
	this.level.player = this.player;
	this.level.addThing(this.player);
	this.level.update(0);
    }
}

/**************/
/* EnterScene */
/**************/

/* A thing to handle the player entering a level. (door opens, player walks
 * through the door, looks around, door closes, level starts) */
function EnterScene(door)
{
    // Waiting for the cutscene to start
    this.IDLE = 0;
    // The cutscene has started
    this.START = 1;
    // Waiting for the door to finish opening
    this.OPENING_DOOR = 2;
    // Waiting for the player to enter the level
    this.PLAYER_ENTERING = 3;
    // Player is looking around
    this.PLAYER_LOOK_LEFT = 4;
    this.PLAYER_LOOK_RIGHT = 5;

    this.door = door;
    // No sprite associated with this thing
    this.sprite = null;
    this.state = this.IDLE;
    this.timer = 0;
    this.travelTime = 0;
}

EnterScene.prototype.update = function(dt)
{
    if (this.timer > 0) {
	this.timer -= dt;
	return;
    }

    switch(this.state) {
    case this.IDLE:
	// Position the player behind the level so they're hidden, and centered 
	// on the door so the camera renders in the right place.
	player.sprite.x = this.door.sprite.x;
	player.sprite.y = this.door.sprite.y+1;
	player.sprite.zpos = BEHIND_BACKGROUND_POS;
	player.hasControl = false;
	this.timer = 0.75;
	this.state = this.START;
	break;

    case this.START:
	// Start the door opening
	this.door.startOpening();
	this.state = this.OPENING_DOOR;
	break;

    case this.OPENING_DOOR:
	// Waiting for the door to open
	if (this.door.isOpen()) {
	    player.sprite.zpos = undefined;
	    this.state = this.PLAYER_ENTERING;
	    this.timer = 0.4;
	    this.travelTime = 0.6;
	}
	break;

    case this.PLAYER_ENTERING:
	// Player walking some ways into the level
	player.diry = 0.5;
	this.travelTime -= dt;
	if (this.travelTime <= 0) {
	    this.state = this.PLAYER_LOOK_LEFT;
	    this.timer = 0.5;
	    this.door.startClosing();
	    player.dirx = 0;
	    player.diry = 0;
	} else if (this.travelTime < 0.35) {
	    player.dirx = 0.25;
	}
	break;

    case this.PLAYER_LOOK_LEFT:
	player.faceDirection(-1);
	this.state = this.PLAYER_LOOK_RIGHT;
	this.timer = 1;
	break;

    case this.PLAYER_LOOK_RIGHT:
	player.faceDirection(1);
	player.hasControl = true;
	this.timer = 0.5;
	// Done!
	level.removeThing(this);
	break;
    }
}
