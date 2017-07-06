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
function Arena(width, endx)
{
    this.startx = 0;
    this.endx = 0;
    if (width !== undefined && endx !== undefined) {
	this.startx = endx - width;
	this.endx = endx;
    }
    // The rounds to play through (Round instances)
    this.rounds = [];
    this.running = [];
    this.round = -1;
    this.finishing = false;
    this.done = false;
    this.doneDelay = 2;
}

// Called once per frame while the arena is active
Arena.prototype.update = function(dt)
{
    if (this.done) return;
    if (this.finishing)
    {
	// This arena is finished, but we wait a bit of time befoer displaying
	// the go marker for the player to advance.
	if (this.doneDelay > 0) {
	    this.doneDelay -= dt;
	    return;
	}
	this.done = true;
	return;
    }

    if (this.round === -1 || this.rounds[this.round].done) 
    {
	if (this.round < this.rounds.length-1) 
	{
	    // Spawn in monsters for the next round
	    this.round++;
	    this.rounds[this.round].activate();
	} else {
	    this.finishing = true;
	}
    } else {
	this.rounds[this.round].update(dt);
    }
}

Arena.prototype.activate = function()
{
}

/*********/
/* Round */
/*********/

// Each round will spawn a number of monsters and includes a "win condition"
// that determines when the round is finished. (and the arena progresses to
// the next round)
function Round(delay)
{
    this.delay = delay || 0;
    // Spawns are initially added to the 'spawns' queue, then moved over to
    // the 'running' queue once they become active.
    this.spawns = [];
    this.running = [];
    this.done = false;
    this.activated = false;
}

Round.prototype.update = function(dt)
{
    // Move spawns over to the 'running' queue
    if (this.spawns.length > 0) {
	if (this.spawns[0].roundDelay > 0) {
	    // Still waiting for the next spawn to start
	    this.spawns[0].roundDelay -= dt;
	} else {
	    var spawn = this.spawns.shift();
	    spawn.activate();
	    this.running.push(spawn);
	}
    }

/*
    if (!this.activated) 
    {
	// Wait a bit before activating the round
	if (this.delay > 0) {
	    this.delay -= dt;
	    return;
	}
	// Activate all the spawners in this round
	for (spawn of this.spawns) {
	    spawn.activate();
	}
	this.activated = true;
    }
*/
    // Wait for all the monsters to die
    this.done = true;
    for (spawn of this.running) {
	if (spawn.update) spawn.update(dt);
	if (!spawn.monster.dead) this.done = false;
    }
}

// Add a monster spawner to this round
Round.prototype.addSpawn = function(spawn, delay)
{
    // TODO - tacky
    spawn.roundDelay = delay || 0;
    this.spawns.push(spawn);
}

/*********/
/* Spawn */
/*********/

// Spawns are triggered by rounds, and add monsters into the arena to fight
// with the player. The spawn determines where to place the monster once the
// round becomes active. Types of spawns: from left, from right, from under 
// water, through a gate, drop from above

// Spawn from the left/right side of the screen (monster starts off-screen)
function Spawn(monster, direction, ypos)
{
    this.monster = monster;
    this.direction = direction;
    this.ypos = ypos;
}

Spawn.prototype.activate = function()
{
    // Start the monster somewhere off screen either left or right
    this.monster.sprite.x = level.camera.x + level.camera.width/2 + 
	this.direction*(level.camera.width/2+20);
    var offset = 0;

    // Find some clear space to spawn the monster (ie don't spawn in a wall)
    var y = level.findClearSpace(this.monster.sprite.x, this.ypos);
    if (y === null) {
	console.log("WARNING: can't spawn monster near " + this.ypos);
	this.monster.dead = true;
    } else {
	this.monster.sprite.y = y;
	level.addThing(this.monster);
    }
}

/*************/
/* GateSpawn */
/*************/

// Monster walks in through a gate
function GateSpawn(monster, gate)
{
    this.monster = monster;
    this.gate = gate;
    this.spawned = false;
    this.closeDelay = 0.5;
}

GateSpawn.prototype.activate = function()
{
    // Start the gate opening
    this.gate.startOpening();
}

GateSpawn.prototype.update = function(dt)
{
    // Wait for the gate to finish opening
    if (!this.spawned && this.gate.isOpen())
    {
	// Spawn in the monster, overtop the opened gate
	this.spawned = true;
	level.addThing(this.monster);
	this.monster.sprite.x = this.gate.sprite.x + 
	    this.gate.sprite.texture.width*SCALE/2;
	this.monster.sprite.y = this.gate.sprite.y + 
	    this.gate.sprite.texture.height*SCALE;
    } 
    else if (this.spawned && this.closeDelay > 0)
    {
	// Wait a bit before closing the gate again
	this.closeDelay -= dt;
	if (this.closeDelay <= 0) {
	    this.gate.startClosing();
	}
    }
}

/*************/
/* DropSpawn */
/*************/

// Monster drops from above to the given location (casting a shadow on the
// way down, etc.)
function DropSpawn(monster, x, y)
{
    this.monster = monster;
    this.xpos = x;
    this.ypos = y;
    this.done = false;
    // Shadow to display on the floor, as the monster is falling
    this.shadow = new Scenery(getFrame(MAPTILES, "shadow"));
    this.shadow.sprite.zpos = FLOOR_POS;
    this.shadow.sprite.anchor.set(0.5, 0.5);
    this.shadow.sprite.x = x;
    this.shadow.sprite.y = y;
    // The monster as it's falling
    var img = this.monster.dropFrame || this.monster.frames[0];
    this.falling = new Scenery(img);
    this.timer = 0.5;
    this.fallSpeed = 200;
}

DropSpawn.prototype.activate = function()
{
    level.addThing(this.shadow);
    this.falling.sprite.zpos = FRONT_POS;
    this.falling.sprite.x = this.xpos;
    this.falling.sprite.y = level.camera.y + 20;
}

DropSpawn.prototype.update = function(dt)
{
    if (this.done) return;
    // Wait a bit before dropping the monster
    if (this.timer > 0) 
    {
	this.timer -= dt;
	if (this.timer <= 0) {
	    // Start the drop
	    level.addThing(this.falling);
	    sounds[DROP_SND].volume = 0.25;
	    sounds[DROP_SND].play();
	}
	return;
    }
    this.falling.sprite.y += this.fallSpeed*dt;
    if (this.falling.sprite.y > this.ypos) 
    {
	// Hit the ground - spawn in the monster
	level.removeThing(this.shadow);
	level.removeThing(this.falling);
	level.addThing(this.monster);
	this.monster.sprite.x = this.xpos;
	this.monster.sprite.y = this.ypos;
	this.done = true;
    }
}

/**************/
/* WaterSpawn */
/**************/

// Monster spawns under water, then rises with bubbles etc
function WaterSpawn(monster, x, y)
{
    this.monster = monster;
    this.xpos = x;
    this.ypos = y;
    var img = getTextures(MAPTILES)["rippling_water"];
    this.water = new Scenery(img);
    this.water.sprite.anchor.set(0.5, 0.7);
    this.water.sprite.x = x;
    this.water.sprite.y = y;
    this.spawnDelay = 1;
}

WaterSpawn.prototype.activate = function()
{
    // Show the water rippling right away
    level.addThing(this.water)
}

WaterSpawn.prototype.update = function(dt)
{
    // Wait for a bit of time before spawning the monster
    if (this.spawnDelay > 0) {
	this.spawnDelay -= dt;
	if (this.spawnDelay <= 0) {
	    level.removeThing(this.water);
	    level.addThing(this.monster);
	    this.monster.sprite.x = this.xpos;
	    this.monster.sprite.y = this.ypos;
	}
    }
}
