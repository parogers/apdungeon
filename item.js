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

ITEM_GRAVITY = 600;

/**************/
/* GroundItem */
/**************/

function GroundItem(img, x, y, item)
{
    this.sprite = new PIXI.Sprite(img);
    this.sprite.anchor.set(0.5, 0.6);
    this.sprite.scale.set(SCALE);
    this.height = 0;
    this.sprite.x = x;
    this.sprite.y = y;
    this.ypos = y;
    this.item = item;
    // Make the render depth fixed here, otherwise as the item bounces it
    // will seem like it's moving back into the scene. (ie disappears behind
    // other sprites)
    this.sprite.zpos = y;
    this.velx = 0;
    this.velz = 0;
    this.velh = 0;
    this.bouncy = 0.5;
    this.hitbox = new Hitbox(0, 0, 5, 5);
}

GroundItem.prototype.update = function(dt)
{
    if (this.velh !== 0) 
    {
	// First move the item into/out of the scene (Z-axis) and make sure
	// we don't bump into anything.
	if (this.velz !== 0) {
	    var dz = this.velz*dt;
	    var tile = level.bg.getTileAt(this.sprite.x, this.ypos+dz);
	    // If we connect with a wall, don't bother bouncing off
	    if (tile.solid) this.velz = 0;
	    else {
		this.ypos += dz;
		this.sprite.zpos += dz;
	    }
	}

	// Move the item left/right having it bounce off walls too. Note we
	// check the "floor" position of the item instead of the sprite pos.
	var dx = this.velx*dt;
	var tile = level.bg.getTileAt(this.sprite.x+dx, this.ypos);
	if (tile.solid) {
	    this.velx *= -1;
	} else {
	    this.sprite.x += dx;
	}
	this.velh += ITEM_GRAVITY*dt;
	this.height -= this.velh*dt;

	// Have the item bounce up/down until it comes to rest
	if (this.height <= 0) {
	    if (this.velh < 10) {
		this.velh = 0;
	    } else {
		this.velh *= -this.bouncy;
		this.height = 0;
	    }
	}
	this.sprite.y = this.ypos - this.height;
    }
}

GroundItem.prototype.handlePlayerCollision = function()
{
    // The player takes the item if it's falling down (or resting) and close
    // enough to the ground.
    if (this.height < 1 && this.velh >= 0) 
    {
	if (this.item && player.handleTakeItem(this.item)) {
	    level.removeThing(this);
	}
    }
}

/* Spawn in the given item, at the given location */
function spawnItem(item, x, y)
{
    var img = getFrame(GROUND_ITEMS, item);
    var gnd = new GroundItem(img, x, y, item);
    level.addThing(gnd);
    return gnd;
}

/*********/
/* Items */
/*********/

// TODO - it would be nice to have item properties stored with the item.
// (eg type of item, size, value, etc) But this is easy for demo purposes.

// The list of takeable items. The values here are used to identify the items
// as well as referring to images on the GROUND_ITEMS sprite sheet.
var Item = {
    NO_ARMOUR: "helmet3",
    LEATHER_ARMOUR: "helmet1",
    STEEL_ARMOUR: "helmet2",
    COIN: "coin",
    SMALL_HEALTH: "small_health",
    LARGE_HEALTH: "large_health",
    SMALL_BOW: "bow1",
    LARGE_BOW: "bow2",
    NO_BOW: "bow3",
    ARROW: "arrow1",
    SMALL_SWORD: "sword1",
    LARGE_SWORD: "sword2",
    MAGIC_SWORD: "sword3",
    NO_SWORD: "sword4",

    NONE: null
};

var SwordItems = [Item.SMALL_SWORD, Item.LARGE_SWORD, Item.MAGIC_SWORD];
var BowItems = [Item.SMALL_BOW, Item.LARGE_BOW];
var ArmourItems = [Item.LEATHER_ARMOUR, Item.STEEL_ARMOUR];

var HeldItem = {
    SMALL_BOW: "bow1",
    LARGE_BOW: "bow2",
    SMALL_SWORD: "sword1",
    LARGE_SWORD: "sword2",
    MAGIC_SWORD: "sword2"
};

function isArmour(item)
{
    return (ArmourItems.indexOf(item) != -1);
}

function isSword(item)
{
    return (SwordItems.indexOf(item) != -1);
}

function isBow(item)
{
    return (BowItems.indexOf(item) != -1);
}

function isArmourBetter(orig, item)
{
    return ArmourItems.indexOf(orig) < ArmourItems.indexOf(item)
}

function isSwordBetter(orig, item)
{
    return SwordItems.indexOf(orig) < SwordItems.indexOf(item)
}

function isBowBetter(orig, item)
{
    return BowItems.indexOf(orig) < BowItems.indexOf(item)
}
