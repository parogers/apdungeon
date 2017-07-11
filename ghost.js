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

var GHOST_IDLE = 0;
var GHOST_ATTACKING = 1;
var GHOST_HURT = 2;
var GHOST_DEAD = 3;

function Ghost(state)
{
    this.name = "Spectre";
    this.frames = getFrames(ENEMIES, "ghost_south_1", "ghost_south_2");
    this.speed = 80;
    this.health = 3;
    this.frame = 0;
    this.facing = 1;
    this.dead = false;
    this.travel = 0;
    this.velx = 0;
    this.vely = 0;
    this.accel = 100;
    this.maxSpeed = 100;
    // The sprite container holding the monster
    this.sprite = new PIXI.Container();
    this.sprite.alpha = 0.75;
    // The actual goblin sprite
    this.ghostSprite = new PIXI.Sprite(this.frames[0]);
    this.ghostSprite.scale.set(SCALE);
    this.ghostSprite.anchor.set(0.5, 6.5/8);
    this.sprite.addChild(this.ghostSprite);
    this.knocked = 0;
    this.knockedTimer = 0;
    this.state = state || GHOST_ATTACKING;
    this.hitbox = new Hitbox(0, -2*SCALE, 6*SCALE, 6*SCALE);
}

Ghost.prototype.dropTable = [
    [Item.SMALL_HEALTH, 1],
    [Item.LARGE_HEALTH, 5]
];

Ghost.prototype.update = function(dt)
{
    if (this.state === GHOST_ATTACKING) this.updateAttacking(dt);
    else if (this.state === GHOST_HURT) this.updateHurt(dt);
    else if (this.state === GHOST_DEAD) {
	level.removeThing(this);
    }
}

Ghost.prototype.updateAttacking = function(dt)
{
    var accelx = player.sprite.x - this.sprite.x;
    var accely = player.sprite.y - this.sprite.y;
    var mag = Math.sqrt(accelx*accelx + accely*accely);
    accelx = this.accel*accelx/mag;
    accely = this.accel*accely/mag;

    this.velx += accelx*dt;
    this.vely += accely*dt;

    var speed = Math.sqrt(this.velx*this.velx + this.vely*this.vely);
    if (speed > this.maxSpeed) {
	this.velx = this.maxSpeed*this.velx/speed;
	this.vely = this.maxSpeed*this.vely/speed;
    }

    this.sprite.x += this.velx*dt+Math.cos(this.frame);
    this.sprite.y += this.vely*dt+Math.sin(this.frame);

/*    // Check if we can move left/right
    var tile = level.bg.getTileAt(this.sprite.x+dx, this.sprite.y);
    if (!tile.solid) {
	this.sprite.x += dx;
    }

    // Now check if it can move up/down. Doing this separately from the check
    // above means we can "slide" along walls and such.
    var tile2 = level.bg.getTileAt(this.sprite.x, this.sprite.y+dy);
    if (!tile2.solid) {
	// Go a bit faster if we're just moving up/down
	if (tile.solid) this.sprite.y += 3*dy;
	else {
	    this.sprite.y += dy;
	}
    }*/
    this.frame += 4*dt;
    this.ghostSprite.texture = this.frames[(this.frame%this.frames.length)|0];
}

Ghost.prototype.updateHurt = function(dt)
{
    // Slide backwards from the hit
    if (this.knockedTimer > 0) {
	var dx = this.knocked*dt;
	var tile = level.bg.getTileAt(this.sprite.x+dx, this.sprite.y);
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
	sounds[DEAD_SND].play();
	this.state = GHOST_DEAD;
	// Drop a reward
	level.handleTreasureDrop(this.dropTable, this.sprite.x, this.sprite.y);
	player.handleMonsterKilled(this);
	this.dead = true;

    } else {
	sounds[SNAKE_HURT_SND].play();
	this.knocked = Math.sign(this.sprite.x-srcx)*500;
	this.knockedTimer = 0.1;
	this.state = GHOST_HURT;
    }
    return true;
}

Ghost.prototype.handlePlayerCollision = function()
{
    player.takeDamage(4, this);
}
