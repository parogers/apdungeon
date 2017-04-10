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

/*********/
/* Arena */
/*********/

// A region of the level where the player battles monsters and collects 
// treasures. Once all monsters in the region are defeated the player can
// move forward. (a "Go" arrow is displayed)
function Arena()
{
    // The start and end of the arena. (positions within the level) Once the
    // player passes the 'startx' position the arena is considered activated,
    // and they won't be able to proceed past 'endx' until all monsters are
    // defeated.
    this.startx = 0;
    this.endx = 0;
    // The rounds to play through (Round instances)
    this.rounds = [];
    this.round = -1;
    this.done = false;
}

// Called once per frame while the arena is active
Arena.prototype.update = function(dt)
{
    if (this.round === -1 || this.rounds[this.round].done) 
    {
	if (this.round < this.rounds.length-1) 
	{
	    // Spawn in monsters for the next round
	    this.round++;
	    console.log("NEXT ROUND " + this.round);
	    for (monster of this.rounds[this.round].monsters) {
		var dir = monster._spawnDirection || -1;
		level.addThing(monster);
		monster.sprite.x = level.camera.x + level.camera.width/2 + 
		    -1*dir*(level.camera.width/2+20);
		monster.sprite.y = level.bg.getHeight()/2;
	    }
	}
    } else {
	this.rounds[this.round].update(dt);
    }
}

Arena.prototype.activate = function()
{
    // Add the "go" sign to the stage
}

// Types of spawns: from left, from right, from under water, through a gate,
// drop from above
function Spawn()
{
}

// Each round will spawn a number of monsters and includes a "win condition"
// that determines when the round is finished. (and the arena progresses to
// the next round)
function Round()
{
    this.monsters = [];
    this.done = false;
}

Round.prototype.update = function(dt)
{
    for (monster of this.monsters) {
	if (!monster.dead) return;
    }
    this.done = true;
}

// Add a monster to this round, indicating which direction it should come 
// from on screen. (-1 == from the right, 1 == from the left)
Round.prototype.addMonster = function(thing, direction)
{
    thing._spawnDirection = direction;
    this.monsters.push(thing);
}
