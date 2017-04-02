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

function GroundItem(img, x, y)
{
    this.sprite = new PIXI.Sprite(img);
    this.sprite.anchor.set(0.5, 0.6);
    this.sprite.scale.set(SCALE);
    this.height = 0;
    this.sprite.x = x;
    this.ypos = y;
    this.velx = 0;
    this.velh = 0;
    this.bouncy = 0.5;
}

GroundItem.prototype.update = function(dt)
{
    if (this.velh !== 0) {
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
