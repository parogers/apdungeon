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

function Snake()
{
    this.sprite = null;
    this.frames = ["snake_south_1", "snake_south_2"];
    this.frame = 0;
    this.facing = 1;
    this.travel = 100;
}

Snake.prototype.spawn = function(stage)
{
    this.sprite = new PIXI.Sprite();
    this.sprite.scale.set(SCALE);
    this.sprite.anchor.set(0.5, 6.5/8);
    this.sprite.texture = getTextures(ENEMIES)[this.frames[0]];
    return this.sprite;
}

Snake.prototype.update = function(dt)
{
    var dx = 0, dy = 0;
    if (this.travel > 0) {
	dx = 100*dt*this.facing;
	this.sprite.scale.x = this.facing*Math.abs(this.sprite.scale.x);
	this.travel -= Math.abs(dx);
    } else {
	if (player.sprite.x < this.sprite.x) this.facing = -1;
	else this.facing = 1;
	this.travel = 100;
    }

    var dist = player.sprite.y - this.sprite.y;
    if (Math.abs(dist) > 10) {
	dy = dt*20*Math.sign(dist);
    }

    var tile = bg.getTileAt(this.sprite.x+dx, this.sprite.y);
    if (!tile.solid) {
	this.sprite.x += dx;
    }

    var tile2 = bg.getTileAt(this.sprite.x, this.sprite.y+dy);
    if (!tile2.solid) {
	if (tile.solid) this.sprite.y += 3*dy;
	else this.sprite.y += dy;
    }

    this.frame += 3*dt;
    var f = this.frames[(this.frame%this.frames.length)|0];
    this.sprite.texture = getTextures(ENEMIES)[f];
}

