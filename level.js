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

function compareDepth(s1, s2) {
    var z1 = s1.zpos || s1.y;
    var z2 = s2.zpos || s2.y;
    return z1-z2;
}

function Camera()
{
    this.x = 0;
    this.y = 0;
    this.width = 0;
    this.height = 0;
}

function Level(bg)
{
    this.camera = new Camera();
    this.player = null;
    this.stage = null;
    // The background sprite (TiledBackground)
    this.bg = bg;
    this.bg.zpos = BACKGROUND_POS;
    // List of enemies, interactable objects etc and the player
    this.things = [];
    this.stage = new PIXI.Container();
    this.stage.addChild(this.bg.sprite);
}

Level.prototype.update = function(dt)
{
    //camera.x = player.spriteContainer.x-100;
    this.stage.x = -this.camera.x;
    this.stage.y = -this.camera.y;
    this.camera.width = renderer.width;
    this.camera.height = renderer.height;

    for (var n = 0; n < this.things.length; n++) {
	this.things[n].update(dt);
    }
}

Level.prototype.render = function()
{
    this.stage.children.sort(compareDepth);
    renderer.render(this.stage);
}

Level.prototype.checkHitNEW = function(hitbox, ignore)
{
    var thing = null;
    for (var n = 0; n < this.things.length; n++) 
    {
	thing = this.things[n];
	if (thing !== ignore && thing.sprite && thing.hitbox && 
	    Math.abs(hitbox.x - thing.sprite.x) < hitbox.w + thing.hitbox.w && 
	    Math.abs(hitbox.y - thing.sprite.y) < hitbox.h + thing.hitbox.h)
	{
	    return thing;
	}
    }
    return null;
}

Level.prototype.checkHit = function(pts, ignore)
{
    var thing = null;
    for (var n = 0; n < this.things.length; n++) 
    {
	thing = this.things[n];
	if (thing !== ignore && thing.sprite && thing.sprite.containsPoint) 
	{
	    if (pts.length === undefined) {
		// Single point passed in
		if (thing.sprite.containsPoint(pts)) {
		    return thing;
		} 
	    } else {
		// List of points passed in
		for (var i = 0; i < pts.length; i++) {
		    if (thing.sprite.containsPoint(pts[i])) {
			return thing;
		    } 
		}
	    }
	}
    }
    return null;
}

Level.prototype.checkHitMany = function(pts, ignore)
{
    var hit = [];
    var thing = null;
    for (var n = 0; n < this.things.length; n++) 
    {
	thing = this.things[n];
	if (thing !== ignore && thing.sprite && thing.sprite.containsPoint) 
	{
	    if (pts.length === undefined) {
		// Single point passed in
		if (thing.sprite.containsPoint(pts)) {
		    hit.push(thing);
		} 
	    } else {
		// List of points passed in
		for (var i = 0; i < pts.length; i++) {
		    if (thing.sprite.containsPoint(pts[i])) {
			hit.push(thing);
			break;
		    } 
		}
	    }
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

    if (thing.sprite) {
	this.stage.removeChild(thing.sprite);
    }
}
