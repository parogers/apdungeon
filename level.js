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
    return z1-z2;
}

// The various level stages
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
    this.goMarker = null;
    this.state = LEVEL.NEXT_ARENA;
    // The background sprite (TiledBackground)
    this.bg = bg;
    this.bg.zpos = BACKGROUND_POS;
    // List of enemies, interactable objects etc and the player
    this.things = [];
    // The PIXI container for everything we want to draw
    this.stage = new PIXI.Container();
    // The container holding all sprites in the level
    this.levelStage = new PIXI.Container();
    this.levelStage.addChild(this.bg.sprite);
    // The container holding all user interface stuff
    this.guiStage = new PIXI.Container();
    this.stage.addChild(this.levelStage);
    this.stage.addChild(this.guiStage);
    // List of arenas in this level (Arena instances)
    this.arenas = [];
    // Current active arena (number)
    this.arenaNum = 0;
    this.smoothTracking = true;

    this.healthUI = new HealthUI();
    this.healthUI.sprite.x = this.camera.width-1;
    this.healthUI.sprite.y = this.bg.sprite.texture.height*SCALE-10;
    this.addThing(this.healthUI);

    var inv = new InventoryUI();
    inv.sprite.x = 30;
    inv.sprite.y = this.bg.sprite.texture.height*SCALE+15;
    this.addThing(inv);
}

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
		this.goMarker = new GoMarker();
		this.addThing(this.goMarker);
		// Advance to the next arena
		this.arenaNum++;
		this.state = LEVEL.SHOWING_GO;
	    } else {
		// No more arenas - finished the level!
		this.state = LEVEL.END_LEVEL;
	    }
	} else {
	    arena.update(dt);
	}
	// Update the camera - the player has full mobility within the 
	// start and stop bounds of the arena.
	var xpos = player.sprite.x - this.camera.width/2;
	if (xpos >= arena.startx && xpos + this.camera.width <= arena.endx) {
	    this.camera.x = xpos;
	}
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
	if (xpos >= 0) {
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
	}

	// Also remove the go marker (if it's done animated) since the player
	// already knows to move forward by now.
	if (this.goMarker && this.goMarker.done) {
	    this.removeThing(this.goMarker);
	    this.goMarker = null;
	}

	// Wait for the player to move into the next arena
	if (this.camera.x + this.camera.width >= arena.endx-1)
	{
	    // Snap the camera into place and activate the next arena
	    this.camera.x = arena.endx - this.camera.width;
	    arena.activate();
	    this.state = LEVEL.ACTIVE_ARENA;
	    // If somehow the go marker is sticking around (maybe the player
	    // is moving _really_ fast) remove it now, done or not.
	    if (this.goMarker) {
		this.removeThing(this.goMarker);
		this.goMarker = null;
	    }
	}
	break;

    case LEVEL.END_LEVEL:
	break;

    }

    // Position the camera
    this.levelStage.x = -this.camera.x;
    this.levelStage.y = -this.camera.y;
    // Update everything in the level
    for (var n = 0; n < this.things.length; n++) {
	if (this.things[n].update) this.things[n].update(dt);
    }
}

Level.prototype.render = function()
{
    this.levelStage.children.sort(compareDepth);
    renderer.render(this.stage);
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
	if (thing.guiLayer) {
	    this.guiStage.addChild(thing.sprite);
	} else {
	    this.levelStage.addChild(thing.sprite);
	}
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
