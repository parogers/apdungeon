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

PRIMARY = 65;
ARROW_UP = 38;
ARROW_LEFT = 37;
ARROW_RIGHT = 39;
ARROW_DOWN = 40;

function GameControls()
{
    this.up = false;
    this.down = false;
    this.left = false;
    this.right = false;
    this.primary = false;

    this.lastUp = false;
    this.lastDown = false;
    this.lastLeft = false;
    this.lastRight = false;
    this.lastPrimary = false;
}

GameControls.prototype.getX = function()
{
    return (this.right - this.left);
}

GameControls.prototype.getY = function()
{
    return (this.down - this.up);
}

GameControls.prototype.update = function()
{
    this.lastUp = this.up;
    this.lastDown = this.down;
    this.lastLeft = this.left;
    this.lastRight = this.right;
    this.lastPrimary = this.primary;
}

function attachKeyDown(controls)
{
    window.addEventListener("keydown", function(event) {
	switch(event.keyCode) {
	case ARROW_UP:
	    controls.up = true;
	    break;
	case ARROW_DOWN:
	    controls.down = true;
	    break;
	case ARROW_LEFT:
	    controls.left = true;
	    break;
	case ARROW_RIGHT:
	    controls.right = true;
	    break;
	case PRIMARY:
	    controls.primary = true;
	    break;
	}
	event.stopPropagation();
    });
}

function attachKeyUp(controls)
{
    window.addEventListener("keyup", function(event) {
	switch(event.keyCode) {
	case ARROW_UP:
	    controls.up = false;
	    break;
	case ARROW_DOWN:
	    controls.down = false;
	    break;
	case ARROW_LEFT:
	    controls.left = false;
	    break;
	case ARROW_RIGHT:
	    controls.right = false;
	    break;
	case PRIMARY:
	    controls.primary = false;
	    break;
	}
	event.stopPropagation();
    });
}

GameControls.prototype.attach = function()
{
    attachKeyDown(this);
    attachKeyUp(this);
}