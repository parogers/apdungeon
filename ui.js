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

function HealthUI()
{
    //var texture = getTextures(GROUND_ITEMS)["coin"];
    this.sprite = new PIXI.Container();
    this.guiLayer = true;
    this.hearts = [];
    this.fullHeart = getFrame(UI, "full_heart");
    this.emptyHeart = getFrame(UI, "empty_heart");

    for (var n = 0; n < 3; n++) {
	this.addHeart();
    }
}

// Adds a heart to the UI
HealthUI.prototype.addHeart = function()
{
    var heart = new PIXI.Sprite(this.fullHeart);
    heart.scale.set(SCALE);
    heart.x = this.hearts.length*(heart.texture.width+1)*SCALE;
    this.hearts.push(heart);
    this.sprite.addChild(heart);
}

// Removes the last heart from this UI
HealthUI.prototype.removeHeart = function()
{
    if (this.hearts.length > 0) {
	this.sprite.removeChild(this.hearts.pop());
    }
}

HealthUI.prototype.update = function(dt)
{
    // Add hearts to match the player's max health
    while (this.hearts.length < player.maxHealth) {
	this.addHeart();
    }
    // Remove hearts to match the player's max health
    while (this.hearts.length > player.maxHealth) {
	this.removeHeart();
    }
    // Synchronize the hearts to reflect the player's health
    for (var n = 0; n < this.hearts.length; n++) {
	if (n <= player.health) {
	    this.hearts[n].texture = this.fullHeart;
	} else {
	    this.hearts[n].texture = this.emptyHeart;
	}
    }
}
