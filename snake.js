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

var SNAKE_IDLE = 0;
var SNAKE_ATTACKING = 1;
var SNAKE_HURT = 2;
var SNAKE_DEAD = 3;

function Snake(state)
{
    this.frames = getFrames(ENEMIES, "snake_south_1", "snake_south_2");
    this.speed = 80;
    this.health = 3;
    this.frame = 0;
    this.facing = 1;
    this.dead = false;
    this.travel = 0;
    // The sprite container holding the snake and splash sprite
    this.sprite = new PIXI.Container();
    // The actual snake sprite
    this.snakeSprite = new PIXI.Sprite();
    this.snakeSprite.scale.set(SCALE);
    this.snakeSprite.anchor.set(0.5, 6.5/8);
    this.sprite.addChild(this.snakeSprite);
    // Make the splash/water sprite
    this.waterSprite = createSplashSprite();
    this.waterSprite.y = -1.25*SCALE;
    this.sprite.addChild(this.waterSprite);
    this.knocked = 0;
    this.knockedTimer = 0;
    this.state = state || SNAKE_IDLE;
    this.hitbox = new Hitbox(0, -1*SCALE, 6*SCALE, 6*SCALE);
}

Snake.prototype.update = function(dt)
{
    if (this.state === SNAKE_IDLE) this.updateIdle(dt);
    else if (this.state === SNAKE_ATTACKING) this.updateAttacking(dt);
    else if (this.state === SNAKE_HURT) this.updateHurt(dt);
    else if (this.state === SNAKE_DEAD) {
	level.removeThing(this);
    }
}

Snake.prototype.updateIdle = function(dt)
{
    this.frame += 2*dt;
    this.snakeSprite.texture = this.frames[(this.frame%this.frames.length)|0];

    // Turn left/right searching for the player
    this.facing = Math.sign(Math.cos(this.frame/10));
    this.sprite.scale.x = this.facing*Math.abs(this.sprite.scale.x);

    // Start attacking the player when they're close enough, and when
    // the snake is facing them.
    if (Math.abs(player.sprite.x - this.sprite.x) < renderer.width/3 &&
	this.facing*(player.sprite.x - this.sprite.x) > 0) 
    {
	this.state = SNAKE_ATTACKING;
    }
}

Snake.prototype.updateAttacking = function(dt)
{
    var dx = 0, dy = 0;

    // Move towards the player for a bit. Note the snake moves in "steps"
    // so it will occasionally overshot the player before moving back again.
    if (this.travel > 0) {
	dx = this.speed*dt*this.facing;
	this.sprite.scale.x = this.facing*Math.abs(this.sprite.scale.x);
	this.travel -= Math.abs(dx);
    } else {
	if (player.sprite.x < this.sprite.x) this.facing = -1;
	else this.facing = 1;
	this.travel = randint(80, 100);
    }

    // Move up/down towards the player more slowly (and don't overshoot)
    var dist = player.sprite.y - this.sprite.y;
    if (Math.abs(dist) > 10) {
	dy = dt*20*Math.sign(dist);
    }

    // Check if the snake can move left/right
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
    this.snakeSprite.texture = this.frames[(this.frame%this.frames.length)|0];
}

Snake.prototype.updateHurt = function(dt)
{
    // The snake keeps its eyes closed while hurt
    this.snakeSprite.texture = this.frames[1];
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
	this.state = SNAKE_ATTACKING;
	this.travel = 0;
    }
}

Snake.prototype.handleHit = function(srcx, srcy, dmg)
{
    if (this.state === SNAKE_DEAD) return false;
    this.health -= 1;
    if (this.health <= 0) {
	sounds[DEAD_SND].play();
	this.state = SNAKE_DEAD;
	// Drop a reward
	var coin = spawnItem(Item.COIN, this.sprite.x, this.sprite.y);
	coin.velx = 50*Math.sign(this.sprite.x-srcx);
	coin.velh = -200;
	this.dead = true;

    } else {
	sounds[SNAKE_HURT_SND].play();
	this.knocked = Math.sign(this.sprite.x-srcx)*300;
	this.knockedTimer = 0.1;
	this.state = SNAKE_HURT;
    }

    // Add some random blood, but only if we're not currently in water
    // (looks better this way)
    var tile = level.bg.getTileAt(this.sprite.x, this.sprite.y);
    if (!tile.water) {
	var sprite = createBloodSpatter();
	sprite.x = this.sprite.x;
	sprite.y = this.sprite.y-1;
	level.stage.addChild(sprite);
    }
    return true;
}

Snake.prototype.handlePlayerCollision = function()
{
    player.takeDamage(1, this);
}

/* Other snake-like things */

function Rat()
{
    Snake.call(this);
    this.frames = getFrames(ENEMIES, "rat_south_1", "rat_south_2");
    this.health = 1;
    this.speed = 100;
    this.frame = 0;
    this.facing = 1;
    this.travel = 100;
    this.sprite = new PIXI.Sprite();
    this.sprite.scale.set(SCALE);
    this.sprite.anchor.set(0.5, 6.5/8);
    this.knocked = 0;
    this.knockedTimer = 0;
    this.state = SNAKE_IDLE;
}

Rat.prototype = Object.create(Snake.prototype);

function Scorpion()
{
    Snake.call(this);
    this.frames = getFrames(ENEMIES, "scorpion_south_1", "scorpion_south_2");
    this.health = 4;
    this.speed = 50;
    this.frame = 0;
    this.facing = 1;
    this.travel = 100;
    this.sprite = new PIXI.Sprite();
    this.sprite.scale.set(SCALE);
    this.sprite.anchor.set(0.5, 6.5/8);
    this.knocked = 0;
    this.knockedTimer = 0;
    this.state = SNAKE_IDLE;
}

Scorpion.prototype = Object.create(Snake.prototype);
