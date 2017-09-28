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
var Item = require("./item");

var GHOST_IDLE = 0;
var GHOST_ATTACKING = 1;
var GHOST_HURT = 2;
var GHOST_DEAD = 3;

function Ghost(state)
{
    this.name = "Spectre";
    this.frames = Utils.getFrames(RES.ENEMIES, Ghost.FRAMES);
    this.health = 3;
    this.frame = 0;
    this.facing = 1;
    this.dead = false;
    this.travel = 0;
    this.velx = 0;
    this.vely = 0;
    this.accel = 20;
    this.maxSpeed = 30;
    // The sprite container holding the monster
    this.sprite = new PIXI.Container();
    this.sprite.alpha = 0.75;
    // The actual sprite
    this.ghostSprite = new PIXI.Sprite(this.frames[0]);
    this.ghostSprite.anchor.set(0.5, 6.5/8);
    this.sprite.addChild(this.ghostSprite);
    this.knocked = 0;
    this.knockedTimer = 0;
    this.state = state || GHOST_ATTACKING;
    this.hitbox = new Thing.Hitbox(0, 0, 8, 4);
}

Ghost.FRAMES = ["ghost_south_1", "ghost_south_2"];

Ghost.prototype.getDropTable = function() 
{
    return [[Item.Table.SMALL_HEALTH, 1],
	    [Item.Table.LARGE_HEALTH, 5]];
}

Ghost.prototype.update = function(dt)
{
    if (this.state === GHOST_ATTACKING) this.updateAttacking(dt);
    else if (this.state === GHOST_HURT) this.updateHurt(dt);
    else if (this.state === GHOST_DEAD) {
	this.level.removeThing(this);
    }
}

Ghost.prototype.updateAttacking = function(dt)
{
    var accelx = player.sprite.x - this.sprite.x;
    var accely = player.sprite.y - this.sprite.y;
    var mag = Math.sqrt(accelx*accelx + accely*accely);
    accelx = this.accel*accelx/mag;
    accely = this.accel*accely/mag;

    this.velx += accelx*dt + 10*Math.cos(this.frame)*dt;
    this.vely += accely*dt + 10*Math.sin(this.frame)*dt;

    var speed = Math.sqrt(this.velx*this.velx + this.vely*this.vely);
    if (speed > this.maxSpeed) {
	this.velx = this.maxSpeed*this.velx/speed;
	this.vely = this.maxSpeed*this.vely/speed;
    }

    this.sprite.x += this.velx*dt;//+Math.cos(this.frame);
    this.sprite.y += this.vely*dt;//+Math.sin(this.frame);

    this.frame += 4*dt;
    this.ghostSprite.texture = this.frames[(this.frame%this.frames.length)|0];
}

Ghost.prototype.updateHurt = function(dt)
{
    // Slide backwards from the hit
    if (this.knockedTimer > 0) {
	var dx = this.knocked*dt;
	var tile = this.level.bg.getTileAt(this.sprite.x+dx, this.sprite.y);
	if (!tile.solid) {
	    this.sprite.x += dx;
	}
	this.knockedTimer -= dt;
    } else {
	// Resume/start attacking
	this.state = GHOST_ATTACKING;
	this.travel = 0;
    }
}

Ghost.prototype.handleHit = function(srcx, srcy, dmg)
{
    if (this.state === GHOST_DEAD) return false;
    this.health -= 1;
    if (this.health <= 0) {
	Utils.getSound(RES.DEAD_SND).play();
	this.state = GHOST_DEAD;
	// Drop a reward
	this.level.handleTreasureDrop(
	    this.getDropTable(), this.sprite.x, this.sprite.y);
	player.handleMonsterKilled(this);
	this.dead = true;

    } else {
	Utils.getSound(RES.SNAKE_HURT_SND).play();
	this.knocked = Math.sign(this.sprite.x-srcx)*100;
	this.knockedTimer = 0.1;
	this.state = GHOST_HURT;
    }
    return true;
}

Ghost.prototype.handlePlayerCollision = function()
{
    player.takeDamage(4, this);
}

module.exports = Ghost;

