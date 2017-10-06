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
var Utils = require("./utils");
var Render = require("./render");
var LevelGenerator = require("./genlevel");
var GroundItem = require("./grounditem");

/**********/
/* Camera */
/**********/

function Camera(w, h)
{
    this.x = 0;
    this.y = 0;
    this.width = w;
    this.height = h;
}

//Camera.autoFit

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

    this.camera = new Camera(Level.CAMERA_WIDTH, Level.CAMERA_HEIGHT);
    this.player = null;
    this.stage = null;
    this.state = this.NEXT_ARENA;
    // The background sprite (TiledBackground)
    this.bg = bg;
    this.bg.zpos = Level.BACKGROUND_POS;
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

Level.BEHIND_BACKGROUND_POS = -1;
Level.BACKGROUND_POS = 0;
Level.FLOOR_POS = 1;
Level.FRONT_POS = 10000;

Level.CAMERA_WIDTH = 100;
Level.CAMERA_HEIGHT = 65;

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
        offset += RES.TILE_HEIGHT;
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
        //var xpos = this.player.sprite.x - this.camera.width/2;
        //xpos = Math.max(xpos, arena.startx);
        //xpos = Math.min(xpos, arena.endx-this.camera.width);
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
        if (arena && this.camera.x + this.camera.width >= arena.endx)
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
    for (let thing of this.things) {
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
    for (let thing of this.things)
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

/* Iterates over all things in this level, and calls the given function
 * for each thing that overlaps with the given hitbox. */
Level.prototype.forEachThingHit = function(x, y, hitbox, ignore, callback)
{
    let xp = x + hitbox.x;
    let yp = y + hitbox.y;
    let w = hitbox.w;
    let h = hitbox.h;

    for (let thing of this.things)
    {
        if (thing !== ignore && thing.sprite && 
            thing.hitbox && thing.hitbox !== hitbox && 
            Math.abs(xp-thing.sprite.x-thing.hitbox.x) < (w+thing.hitbox.w)/2 &&
            Math.abs(yp-thing.sprite.y-thing.hitbox.y) < (h+thing.hitbox.h)/2)
        {
            callback(thing);
        }
    }
}

Level.prototype.checkSolidAt = function(x, y, width)
{
    var left = this.bg.getTileAt(x-width/2, y);
    var right = this.bg.getTileAt(x+width/2, y);
    return left.solid || right.solid;
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
    for (let entry of table) {
        total += entry[1];
    }
    // Pick a random number, then iterate over the items and find what 
    // item it corresponds to.
    var pick = null;
    var num = Utils.randint(0, total);
    for (let entry of table) {
        num -= entry[1];
        if (num <= 0) {
            pick = entry[0];
            break;
        }
    }
    // Drop the item
    if (pick !== null) {
        var gnd = new GroundItem(pick, x, y);
        gnd.velx = 10*(x > this.camera.x ? -1 : 1);
        gnd.velh = -40;
        this.addThing(gnd);
    }
}

Level.prototype.createBloodSpatter = function(x, y, imgs)
{
    var txt = Utils.randomChoice(imgs || ["blood1", "blood2", "blood3"]);
    var sprite = new PIXI.Sprite(Utils.getFrame(RES.MAPTILES, txt));
    sprite.zpos = Level.FLOOR_POS;
    sprite.anchor.set(0.5, 0.5);
    sprite.x = x;
    sprite.y = y;
    this.stage.addChild(sprite);
    return sprite;
}

module.exports = Level;
