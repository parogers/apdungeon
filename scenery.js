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

function Scenery(img)
{
    this.sprite = new PIXI.Sprite(img);
    this.sprite.anchor.set(0.5, 1);
    this.sprite.scale.set(SCALE);
    this.timer = 0;
    this.velx = 0;
    this.vely = 0;
}

Scenery.prototype.update = function(dt)
{
    this.sprite.x += this.velx*dt;
    this.sprite.y += this.vely*dt;
    if (this.timer > 0) {
	this.timer -= dt;
	if (this.timer <= 0) {
	    level.removeThing(this);
	}
    }
}

