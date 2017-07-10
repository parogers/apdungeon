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

var SKEL_WARRIOR_IDLE = 0;
// Slowly approaching the player
var SKEL_WARRIOR_START_APPROACH = 1;
var SKEL_WARRIOR_APPROACH = 2;
// Actually attacking the player
var SKEL_WARRIOR_ATTACKING = 3;
var SKEL_WARRIOR_POST_ATTACK = 4;
// Knocked back
var SKEL_WARRIOR_HURT = 5;
var SKEL_WARRIOR_DEAD = 6;

/* The goblin keeps their distance while the player is facing them, and 
 * quickly approaches to attack when the player's back is turned */
function SkelWarrior(state)
{
    this.name = "Skeleton Warrior";
    this.idleFrame = getFrame(ENEMIES, "skeleton_warrior_south_1");
    this.frames = getFrames(
	ENEMIES, "skeleton_warrior_south_2", "skeleton_warrior_south_3");
    this.speed = 100;
    this.health = 3;
    this.frame = 0;
    this.facing = 1;
    this.dead = false;
    // When approaching the player, how far to keep distance
    this.approachDist = 150;
    this.timer = null;
    this.counter = 0;
    // The sprite container holding the monster and splash sprite
    this.sprite = new PIXI.Container();
    // The actual goblin sprite
    this.goblinSprite = new PIXI.Sprite();
    this.goblinSprite.scale.set(SCALE);
    this.goblinSprite.anchor.set(0.5, 6.5/8);
    this.sprite.addChild(this.goblinSprite);
    // Make the splash/water sprite
    this.waterSprite = createSplashSprite();
    this.waterSprite.y = -0.5*SCALE;
    this.sprite.addChild(this.waterSprite);
    this.knocked = 0;
    this.knockedTimer = 0;
    this.state = state || SKEL_WARRIOR_START_APPROACH;
    this.hitbox = new Hitbox(0, -1*SCALE, 6*SCALE, 8*SCALE);
}

SkelWarrior.prototype.dropTable = [
    [Item.LARGE_HEALTH, 5],
    [Item.LEATHER_ARMOUR, 1],
    [Item.SMALL_BOW, 1]
];

SkelWarrior.prototype.update = function(dt)
{
    switch(this.state)
    {
    case SKEL_WARRIOR_ATTACKING:
	this.updateAttacking(dt);
	break;

    case SKEL_WARRIOR_POST_ATTACK:
	this.timer -= dt;
	if (this.timer <= 0) {
	    this.state = SKEL_WARRIOR_START_APPROACH;
	}
	break;

    case SKEL_WARRIOR_START_APPROACH:
	this.timer = null;
	this.state = SKEL_WARRIOR_APPROACH;
	break;

    case SKEL_WARRIOR_APPROACH:
	this.updateApproach(dt);
	break;

    case SKEL_WARRIOR_HURT:
	this.updateHurt(dt);
	break;

    case SKEL_WARRIOR_DEAD:
	level.removeThing(this);
	break;
    }
}

SkelWarrior.prototype.updateAttacking = function(dt)
{
    // Pause before attacking
    if (this.timer > 0) {
	this.timer -= dt;
	return;
    }

    // Rush towards the player
    var dx = 0, dy = 0;
    if (player.sprite.x > this.sprite.x) {
	dx = 2.5*this.speed*dt;
	this.facing = 1;
    } else {
	dx = -2.5*this.speed*dt;
	this.facing = -1;
    }
    this.sprite.scale.x = this.facing*Math.abs(this.sprite.scale.x);

    if (Math.abs(this.sprite.x - player.sprite.x) < 5*SCALE)
    {
	// Hit the player
	// ...
	this.timer = 0.25;
	this.state = SKEL_WARRIOR_POST_ATTACK;
	return;
    }

    // Move up/down towards the player more slowly (and don't overshoot)
    var dist = player.sprite.y - this.sprite.y;
    if (Math.abs(dist) > 2) {
	dy = dt*this.speed*Math.sign(dist)/2.0;
    }

    // Check if we can move left/right
    var tile = level.bg.getTileAt(this.sprite.x+dx, this.sprite.y);
    if (!tile.solid) {
	this.sprite.x += dx;
	this.waterSprite.visible = tile.water;
    }

    // Now check if it can move up/down. Doing this separately from the check
    // above means we can "slide" along walls and such.
    var tile2 = level.bg.getTileAt(this.sprite.x, this.sprite.y+dy);
    if (!tile2.solid) {
	// Go a bit faster if we're just moving up/down
	if (tile.solid) this.sprite.y += 3*dy;
	else {
	    this.sprite.y += dy;
	    this.waterSprite.visible = tile2.water;
	}
    }
    this.frame += 4*dt;
    this.goblinSprite.texture = this.frames[(this.frame%this.frames.length)|0];
}

SkelWarrior.prototype.updateApproach = function(dt)
{
    // Move towards the player, but try to keep a fixed distance away. 
    // Initially the target is set to the player's position, plus/minus
    // a fixed offset.
    var targetx = 0;
    if (this.sprite.x < player.sprite.x) {
	targetx = player.sprite.x - this.approachDist;
	this.facing = 1;
    } else if (this.sprite.x > player.sprite.x) {
	targetx = player.sprite.x + this.approachDist;
	this.facing = -1;
    }
    this.sprite.scale.x = this.facing*Math.abs(this.sprite.scale.x);

    // Rush the player for an attack, if they're facing away from us
    // (note the goblin always faces the player)
    /*if (player.facing*this.facing > 0) {
	this.state = SKEL_WARRIOR_ATTACKING;
	return;
    }*/

    if (this.timer === null) 
    {
	var dist = Math.abs(this.sprite.x-player.sprite.x);
	if (dist >= this.approachDist*0.9 && dist <= this.approachDist*1.1) {
	    this.timer = 1.5;
	}
    } else {
	// Attack the player after a while
	this.timer -= dt;
	if (this.timer <= 0) {
	    this.state = SKEL_WARRIOR_ATTACKING;
	    this.timer = 0.4;
	    return;
	}
    }

    // Add a bit of variation to the target position, so the goblin kind of
    // waivers back and forth making it a bit harder to hit.
    var dx = 0;
    var dy = 0;
    targetx += 20*Math.cos(this.frame/6);
    if (Math.abs(this.sprite.x-targetx) > 2) {
	dx = dt*Math.sign(targetx - this.sprite.x);
    }

    // Move more slowly when going backwards
    var speed = this.speed;
    if (this.facing*dx < 0) speed = this.speed/1.5;

    // Move up/down towards the player as well. Raising sine to a higher power
    // makes the vertical oscillations more "tight". (ie less smooth)
    var targety = player.sprite.y + 35*Math.pow(Math.sin(this.frame/4), 2)-20;
    var dist = targety - this.sprite.y;
    if (Math.abs(dist) > 1) {
	dy = dt*Math.sign(dist);
    }
    dx *= speed;
    dy *= speed;
    // Check if we can move horizontally (checked separately from vertical 
    // movement to prevent us from getting stuck)
    var tile = level.bg.getTileAt(this.sprite.x+dx, this.sprite.y);
    if (!tile.solid) {
	this.sprite.x += dx;
	this.waterSprite.visible = tile.water;
    }
    // Handle vertical movement
    var tile = level.bg.getTileAt(this.sprite.x, this.sprite.y+dy);
    if (!tile.solid) {
	this.sprite.y += dy;
	this.waterSprite.visible = tile.water;
    }
    this.frame += 4*dt;
    this.goblinSprite.texture = this.frames[(this.frame%this.frames.length)|0];
}

SkelWarrior.prototype.updateHurt = function(dt)
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
	this.state = SKEL_WARRIOR_APPROACH;
    }
}

SkelWarrior.prototype.handleHit = function(srcx, srcy, dmg)
{
    if (this.state === SKEL_WARRIOR_DEAD) return false;
    this.health -= 1;
    if (this.health <= 0) {
	sounds[DEAD_SND].play();
	this.state = SKEL_WARRIOR_DEAD;
	// Drop a reward
	level.handleTreasureDrop(this.dropTable, this.sprite.x, this.sprite.y);
	player.handleMonsterKilled(this);
	this.dead = true;

    } else {
	sounds[SNAKE_HURT_SND].play();
	this.knocked = Math.sign(this.sprite.x-srcx)*300;
	this.knockedTimer = 0.1;
	this.state = SKEL_WARRIOR_HURT;
    }

    // Add some random dust, but only if we're not currently in water
    var tile = level.bg.getTileAt(this.sprite.x, this.sprite.y);
    if (!tile.water) {
	var sprite = createBloodSpatter(["dust1", "dust2", "dust3", "dust4"]);
	sprite.x = this.sprite.x;
	sprite.y = this.sprite.y-1;
	level.stage.addChild(sprite);
    }
    return true;
}

SkelWarrior.prototype.handlePlayerCollision = function()
{
    player.takeDamage(1, this);
}
