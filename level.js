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
    //return z1-z2;
    return (z1>z2) - (z2>z1);
}

// The various level states
var LEVEL = {
    // Player is within an active arena
    ACTIVE_ARENA: 1,
    // Showing the go arrow, indicating the player should advance forward
    SHOWING_GO: 2,
    // Player is moving towards next arena (not active yet)
    NEXT_ARENA: 3,
    // Level is finished
    END_LEVEL: 4
};

function Level(bg)
{
    this.camera = new Camera();
    //this.player = null;
    this.stage = null;
    this.state = LEVEL.NEXT_ARENA;
    // The background sprite (TiledBackground)
    this.bg = bg;
    this.bg.zpos = BACKGROUND_POS;
    // List of enemies, interactable objects etc and the player
    this.things = [];
    // The PIXI container for everything we want to draw
    this.stage = new PIXI.Container();
    this.stage.addChild(this.bg.sprite);
    // The container holding all user interface stuff
    /*this.guiStage = new PIXI.Container();
    this.stage.addChild(this.levelStage);
    this.stage.addChild(this.guiStage);*/
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
 * looks up/down until it finds the first pixel of free space. Returns ypos
 */
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
	    // This should never happen, but just in case...
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

// Called every frame to update the general level state
Level.prototype.update = function(dt)
{
    var arena = this.arenas[this.arenaNum];
    switch(this.state) {
    case LEVEL.ACTIVE_ARENA:
	// Wait for the current arena to be finished (ie player defeats 
	// all the monsters)
	if (arena.done) {
	    if (this.arenaNum < this.arenas.length-1) {
		// Show the "go forward" marker
		screen.goMarker.show();
		// Advance to the next arena
		this.arenaNum++;
		this.state = LEVEL.SHOWING_GO;
	    } else {
		// No more arenas - finished the level!
		this.state = LEVEL.END_LEVEL;
		if (this.exitDoor) this.exitDoor.startOpening();
	    }
	} else {
	    arena.update(dt);
	}
	// Update the camera - the player has full mobility within the 
	// start and stop bounds of the arena.
	var xpos = player.sprite.x - this.camera.width/2;
	xpos = Math.max(xpos, arena.startx);
	xpos = Math.min(xpos, arena.endx-this.camera.width);
	/*if (xpos >= arena.startx && xpos + this.camera.width <= arena.endx) {
	    this.camera.x = xpos;
        }*/
	break;
	
    case LEVEL.SHOWING_GO:
	// Wait for the player to move the level forward by "pushing" the
	// edge of the screen.
	if (player.sprite.x > this.camera.x + this.camera.width*0.8) {
	    this.state = LEVEL.NEXT_ARENA;
	    this.smoothTracking = true;
	}
	break;

    case LEVEL.NEXT_ARENA:
	// Update the camera to track the player. Have the camera move
	// smoothly towards the player to avoid jumping around.
	var xpos = player.sprite.x - this.camera.width/2;
	xpos = Math.max(xpos, 0);
	xpos = Math.min(xpos, this.bg.sprite.width-this.camera.width);
	if (this.smoothTracking) {
	    var dirx = Math.sign(xpos-this.camera.x);
	    this.camera.x += dt*1.25*player.maxSpeed*dirx;
	    if (dirx != Math.sign(xpos-this.camera.x)) {
		// Overshot the target, stop smoothly tracking
		this.smoothTracking = false;
	    }
	} else {
	    this.camera.x = xpos;
	}

	// Also remove the go marker (if it's done animated) since the player
	// already knows to move forward by now.
	if (screen.goMarker.sprite.visible && screen.goMarker.done) {
	    screen.goMarker.hide();
	}

	// Wait for the player to move into the next arena
	if (arena && this.camera.x + this.camera.width >= arena.endx-1)
	{
	    // Snap the camera into place and activate the next arena
	    this.camera.x = arena.endx - this.camera.width;
	    arena.activate();
	    this.state = LEVEL.ACTIVE_ARENA;
	    // If somehow the go marker is sticking around (maybe the player
	    // is moving _really_ fast) remove it now, done or not.
	    if (screen.goMarker.sprite.visible) {
		screen.goMarker.hide();
	    }
	}
	break;

    case LEVEL.END_LEVEL:
	break;
    }

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
    /*for (var n = 0; n < this.things.length; n++) {
	if (this.things[n].update) this.things[n].update(dt);
    }*/
}

Level.prototype.checkHit = function(x, y, hitbox, ignore)
{
    var xp = x + hitbox.x, yp = y + hitbox.y;
    var w = hitbox.w, h = hitbox.h;
    var thing = null;
    for (var n = 0; n < this.things.length; n++) 
    {
	thing = this.things[n];
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

Level.prototype.checkHitMany = function(x, y, hitbox, ignore)
{
    var xp = x + hitbox.x, yp = y + hitbox.y;
    var w = hitbox.w, h = hitbox.h;
    var thing = null;
    var hit = [];
    for (var n = 0; n < this.things.length; n++) 
    {
	thing = this.things[n];
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

// Add a 'thing' to the level and it's sprite to the stage
Level.prototype.addThing = function(thing)
{
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
    }

    if (thing.sprite && thing.sprite.parent) {
	/*if (thing.guiLayer) {
	    this.guiStage.removeChild(thing.sprite);
	} else {
	    this.levelStage.removeChild(thing.sprite);
	}*/
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
    this.level = null;
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
    if (this.level) this.level.update(dt);
    this.healthUI.update(dt);
    this.inventoryUI.update(dt);
    if (this.goMarker.sprite.visible) {
	this.goMarker.update(dt);
    }
}

LevelScreen.prototype.render = function()
{
    renderer.render(this.stage);
}

LevelScreen.prototype.setLevel = function(level)
{
    if (this.level) {
	this.stage.removeChild(this.level.stage);
    }
    if (level) {
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
	//this.goMarker.sprite.width/2-10;
	//this.goMarker.sprite.y = this.goMarker.sprite.height/2+10;
    }
}

/*****************/
/* EnterScene */
/*****************/

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
