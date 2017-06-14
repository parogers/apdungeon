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
    this.velh = 0;
    this.bouncy = 0.5;
    this.hitbox = new Hitbox(0, 0, 5, 5);
}

GroundItem.prototype.update = function(dt)
{
    if (this.velh !== 0) 
    {
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
    if (this.height < 10 && this.velh <= 0) 
    {
	console.log("TOUCH " + this.item);
	if (this.item && player.handleTakeItem(this.item)) {
	    level.removeThing(this);
	}
    }
}

/* Spawn in the given item, at the given location */
function spawnItem(item, x, y)
{
    var imgName = ItemImages[item];
    var img = getFrame(GROUND_ITEMS, imgName);
    var gnd = new GroundItem(img, x, y, item);
    level.addThing(gnd);
    return gnd;
}

/*********/
/* Items */
/*********/

var Item = {
    NONE: 0,
    LEATHER_ARMOUR: 1,
    STEEL_ARMOUR: 2,
    COIN: 3,
    HEALTH: 4
};

var ItemImages = [
    null,
    "helmet1",
    "helmet2",
    "coin",
    "small_health"
];


