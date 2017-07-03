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

function Chest(items)
{
    this.openTexture = getFrame(MAPTILES, "chest_open");
    this.closedTexture = getFrame(MAPTILES, "chest_closed");
    this.sprite = new PIXI.Sprite(this.closedTexture);
    this.sprite.scale.set(SCALE);
    this.sprite.anchor.set(0.5, 0.75);
    this.isOpen = false;
    this.timer = 0;
    this.items = items;
}

Chest.prototype.hitbox = new Hitbox(0, 0, 5, 5);

Chest.prototype.update = function(dt)
{
    if (this.isOpen && this.timer > 0) {
	this.timer -= dt;
	if (this.timer <= 0) {
	    // Eject the contents from the chest
	    for (item of this.items) {
		var gnd = spawnItem(
		    item, 
		    this.sprite.x+5*randUniform(0, 1), 
		    this.sprite.y+10*randUniform(0.1, 1));
		gnd.velx = randomChoice([-1, 1])*randUniform(30, 60);
		gnd.velz = -randUniform(-10, 30);
		gnd.velh = -150*randUniform(0.9, 1);
	    }
	}
    }
}

Chest.prototype.handleHit = function(x, y, dmg)
{
}

Chest.prototype.handlePlayerCollision = function()
{
    if (!this.isOpen) {
	// Open the chest now and start a countdown timer before ejecting 
	// the contents.
	this.sprite.texture = this.openTexture;
	this.isOpen = true;
	this.timer = 0.25;
	sounds[CHEST_SND].play();
    }
}
