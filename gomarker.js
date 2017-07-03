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
    this.frames = [
	getFrame(UI, "go1"), 
	getFrame(UI, "go2")
    ];
    this.sprite = new PIXI.Sprite(this.frames[0]);
    this.sprite.scale.set(SCALE);
    this.sprite.anchor.set(1,0);
    this.timer = 0;
    this.dings = 3;
    this.frameNum = 0;
    this.done = false;
    this.sprite.visible = false;
}

GoMarker.prototype.show = function()
{
    this.done = false;
    this.timer = 0;
    this.dings = 3;
    this.frameNum = 0;
    this.sprite.visible = true;
    this.sprite.texture = this.frames[0];
}

GoMarker.prototype.hide = function()
{
    this.done = true;
    this.sprite.visible = false;
}

GoMarker.prototype.update = function(dt)
{
    if (this.done) return;
    var next = this.timer + dt;
    if (this.timer < 0.3 && next >= 0.3) {
	if (this.dings-- > 0) sounds[GO_SND].play();
	else this.done = true;
	this.frameNum = 1;
    } else if (this.timer < 1 && next >= 1) {
	this.frameNum = 0;
	next = 0;
    }
    this.timer = next;
    this.sprite.texture = this.frames[this.frameNum];
}

GoMarker.prototype.handleHit = function(x, y, dmg)
{
}

GoMarker.prototype.handlePlayerCollision = function()
{
}
