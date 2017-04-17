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

function GoMarker()
{
    this.frames = ["go1", "go2"];
    this.sprite = new PIXI.Sprite();
    this.sprite.scale.set(SCALE);
    this.sprite.anchor.set(0.5,0.5);
    this.sprite.texture = getTextures(UI)[this.frames[0]];
    this.timer = 0;
    this.dings = 3;
    this.frameNum = 0;
}

GoMarker.prototype.update = function(dt)
{
    if (this.dings <= 0) return;
    var next = this.timer + dt;
    if (this.timer < 0.3 && next >= 0.3) {
	if (this.dings-- > 0) sounds[GO_SND].play();
	this.frameNum = 1;
    } else if (this.timer < 1 && next >= 1) {
	this.frameNum = 0;
	next = 0;
    }
    this.timer = next;
    this.sprite.texture = getTextures(UI)[this.frames[this.frameNum]];
}

GoMarker.prototype.handleHit = function(x, y, dmg)
{
}

GoMarker.prototype.handlePlayerCollision = function()
{
}
