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

var RES = require("./res");
var Utils = require("./utils");
var Thing = require("./thing");

function Gate()
{
    this.frames = [
	Utils.getFrame(RES.MAPTILES, "gate_wall_1"),
	Utils.getFrame(RES.MAPTILES, "gate_wall_2"),
	Utils.getFrame(RES.MAPTILES, "gate_wall_3")
    ];
    this.hitbox = new Thing.Hitbox(0, 0, 5, 5);
    this.sprite = new PIXI.Sprite(this.frames[0]);
    this.sprite.anchor.set(0,0);
    this.frameNum = 0;
    this.fps = 2;
    this.moving = 0;
}

Gate.prototype.isOpen = function()
{
    return (this.frameNum === this.frames.length-1 && this.moving === 0);
}

Gate.prototype.startOpening = function()
{
    if (this.frameNum < this.frames.length-1) {
	this.moving = 1;
    }
}

Gate.prototype.startClosing = function()
{
    if (this.frameNum > 0) {
	this.moving = -1;
    }
}

Gate.prototype.update = function(dt)
{
    // The gate is opening or closing
    if (this.moving !== 0) {
	var fnum = Math.round(2*this.frameNum);
	this.frameNum += this.moving*this.fps*dt;
	if (this.frameNum < 0) {
	    // Finished closing
	    this.frameNum = 0;
	    this.moving = 0;
	} else if (this.frameNum >= this.frames.length-1) {
	    // Finished opening
	    this.frameNum = this.frames.length-1;
	    this.moving = 0;
	}
	// Make a "clicksh" noise as the gate is opening. (we do this every
	// other frame to make it more obvious, hence the '2' here and above)
	if (fnum !== Math.round(2*this.frameNum)) {
	    Utils.getSound(RES.GATE_SND).volume = 0.20;
	    Utils.getSound(RES.GATE_SND).play();
	}
    }
    this.sprite.texture = this.frames[Math.round(this.frameNum)|0];
}

Gate.prototype.handleHit = function(x, y, dmg)
{
}

Gate.prototype.handlePlayerCollision = function()
{
    if (this.isOpen() && 
	controls.up && 
	this === this.level.exitDoor && 
	Math.abs(player.sprite.y-this.sprite.y) < 5) 
    {
	// Next level
	this.level.state = this.level.FINISHED;
    }
}

module.exports = Gate;
