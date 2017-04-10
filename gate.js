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

function Hitbox(x, y, w, h)
{
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
}

function Gate()
{
    this.hitbox = new Hitbox(0, 0, 5, 5);
    var texture = getTextures(MAPTILES)["gate_wall_1"];
    this.sprite = new PIXI.Sprite(texture);
    this.sprite.scale.set(SCALE);
    this.sprite.anchor.set(0,0);
}

Gate.prototype.update = function(dt)
{
}

Gate.prototype.handleHit = function(x, y, dmg)
{
}

Gate.prototype.handlePlayerCollision = function()
{
}
