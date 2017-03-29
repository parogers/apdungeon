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

function compareDepth(s1, s2) {
    var z1 = s1.zpos || s1.y;
    var z2 = s2.zpos || s2.y;
    return z1-z2;
}

function Level(bg)
{
    this.camera = new Camera();
    this.player = null;
    this.stage = null;
    // The background sprite (TiledBackground)
    this.bg = bg;
    // List of enemies, interactable objects etc and the player
    this.things = [];
}

Level.prototype.update = function(dt)
{
    //camera.x = player.spriteContainer.x-100;
    this.stage.x = -this.camera.x;
    this.stage.y = -this.camera.y;
    this.camera.width = renderer.width;
    this.camera.height = renderer.height;

    for (var n = 0; n < this.things.length; n++) {
	this.things[n].update(dt);
    }
}

Level.prototype.render = function()
{
    this.stage.children.sort(compareDepth);
    renderer.render(this.stage);
}

Level.prototype.checkHit = function(pt, pt2)
{
    var hit = null;
    var thing = null;
    for (var n = 0; n < this.things.length; n++) 
    {
	thing = this.things[n];
	if (thing.sprite && thing.sprite.containsPoint) 
	{
	    if (thing.sprite.containsPoint(pt) || pt2 !== undefined && 
		thing.sprite.containsPoint(pt2))
	    {
		if (hit === null) hit = [];
		hit.push(this.things[n]);
	    } 
	}
    }
    return hit;
}

Level.prototype.stageLevel = function(stage)
{
    //stage.children = [];
    for (var n = 0; n < this.things.length; n++) {
	if (this.things[n].sprite) {
	    stage.addChild(this.things[n].sprite);
	}
    }
    stage.addChild(this.bg.sprite);
    this.stage = stage;
}
