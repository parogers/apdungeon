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

import { RES } from './res';
import { Utils } from "./utils";

/* Template code for defining a 'thing' in a level. Generally things have 
 * sprites associated with them, and can be interacted with by the player.
 * Note there's no need to subclass because this code doesn't contain any
 * useful base functionality. Just copy+paste and change what's needed. */
export class Thing
{
    constructor()
    {
        // The top-level container that holds all pieces of the sprite
        this.sprite = new PIXI.Container();
        // Position of the hit box relative to the sprite position
        this.hitbox = new Hitbox(0, 0, 4, 4);
        this.level = null;
        this._y = 0;
        this._h = 0;
    }

    get width() {
        return Math.abs(this.sprite.width);
    }

    get height() {
        return Math.abs(this.sprite.height);
    }

    // The horizontal position of the thing (equal to the sprite position)
    get x() {
        return this.sprite.x;
    }

    // The vertical/depth position of the thing. Note this is different
    // than the sprite y-pos if the sprite isn't sitting on the floor.
    get y() {
        return this._y;
    }

    // How far the thing is off the ground (positive values go up the screen
    // and negative values go down)
    get h() {
        return this._h;
    }

    // The z-depth of the sprite for sorting/rendering purposes
    get zpos() {
        return this.sprite.zpos;
    }

    set x(value) {
        this.sprite.x = value;
    }

    // Set the y-pos of this thing (on the floor)
    set y(value)
    {
        this._y = value;
        // This is confusing - the sprite y-pos increases going down
        // the screen while the height off the floor decreases
        this.sprite.y = this._y - this._h;
    }

    // Set the height off the floor for this sprite
    set h(value)
    {
        this._h = value;
        this.sprite.y = this._y - this._h;
    }

    set zpos(value) {
        this.sprite.zpos = value;
    }

    update(dt)
    {
    }

    handleHit(x, y, dmg)
    {
    }

    handlePlayerCollision(player)
    {
    }

    removeSelf()
    {
        if (this.level) {
            this.level.removeThing(this);
        }
    }
}

/**********/
/* Hitbox */
/**********/

// A hitbox that defines an area of a thing to test collisions against. Note
// the (x, y) point is relative to the thing's sprite position, and (w, h)
// defines a rectangle that is centered on that position.
export function Hitbox(x, y, w, h)
{
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
}
