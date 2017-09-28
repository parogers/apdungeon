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

var Utils = require("./utils");

/* Template code for defining a 'thing' in a level. Generally things have 
 * sprites associated with them, and can be interacted with by the player.
 * Note there's no need to subclass because this code doesn't contain any
 * useful base functionality. Just copy+paste and change what's needed. */
function Thing()
{
    // Position of the hit box, relative to the sprite position
    this.hitbox = new Thing.Hitbox(0, 0, 5, 5);
    var texture = Utils.getFrame(RES.GROUND_ITEMS, "coin");
    this.sprite = new PIXI.Sprite(texture);
    this.sprite.anchor.set(0,0);
}

Thing.prototype.update = function(dt)
{
}

Thing.prototype.handleHit = function(x, y, dmg)
{
}

Thing.prototype.handlePlayerCollision = function(player)
{
}

/**********/
/* Hitbox */
/**********/

// A hitbox that defines an area of a thing to test collisions against. Note
// the (x, y) point is relative to the thing's sprite position, and (w, h)
// defines a rectangle that is centered on that position.
Thing.Hitbox = function(x, y, w, h)
{
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
}

module.exports = Thing;

