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

function Snake()
{
    this.frames = ["snake_south_1", "snake_south_2"];
    this.deadFrame = "snake_south_dead";
    this.health = 3;
    this.frame = 0;
    this.facing = 1;
    this.travel = 100;
    this.sprite = new PIXI.Sprite();
    this.sprite.scale.set(SCALE);
    this.sprite.anchor.set(0.5, 6.5/8);
    //this.sprite.texture = getTextures(ENEMIES)[this.frames[0]];
    this.knocked = 0;
    this.knockedTimer = 0;
    this.state = SNAKE_IDLE;
}

Snake.prototype.update = function(dt)
{
    if (this.state === SNAKE_IDLE) this.update_idle(dt);
    else if (this.state === SNAKE_ATTACKING) this.update_attacking(dt);
    else if (this.state === SNAKE_HURT) this.update_hurt(dt);
    else if (this.state === SNAKE_DEAD) {
	this.sprite.texture = getTextures(ENEMIES)[this.deadFrame];
    }
}

Snake.prototype.update_idle = function(dt)
{
    this.frame += 2*dt;
    var f = this.frames[(this.frame%this.frames.length)|0];
    this.sprite.texture = getTextures(ENEMIES)[f];

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

Snake.prototype.update_attacking = function(dt)
{
    var dx = 0, dy = 0;

    // Move towards the player for a bit. Note the snake moves in "steps"
    // so it will occasionally overshot the player before moving back again.
    if (this.travel > 0) {
	dx = 100*dt*this.facing;
	this.sprite.scale.x = this.facing*Math.abs(this.sprite.scale.x);
	this.travel -= Math.abs(dx);
    } else {
	if (player.sprite.x < this.sprite.x) this.facing = -1;
	else this.facing = 1;
	this.travel = 100;
    }

    // Move up/down towards the player more slowly (and don't overshoot)
    var dist = player.sprite.y - this.sprite.y;
    if (Math.abs(dist) > 10) {
	dy = dt*20*Math.sign(dist);
    }

    var tile = level.bg.getTileAt(this.sprite.x+dx, this.sprite.y);
    if (!tile.solid) {
	this.sprite.x += dx;
    }

    var tile2 = level.bg.getTileAt(this.sprite.x, this.sprite.y+dy);
    if (!tile2.solid) {
	if (tile.solid) this.sprite.y += 3*dy;
	else this.sprite.y += dy;
    }

    this.frame += 4*dt;
    var f = this.frames[(this.frame%this.frames.length)|0];
    this.sprite.texture = getTextures(ENEMIES)[f];
}

Snake.prototype.update_hurt = function(dt)
{
    // The snake keeps its eyes closed while hurt
    this.sprite.texture = getTextures(ENEMIES)[this.frames[1]];
    // Slide backwards from the hit
    if (this.knockedTimer > 0) {
	this.sprite.x += this.knocked*dt;
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
    } else {
	sounds[SNAKE_HURT_SND].play();
	this.knocked = Math.sign(this.sprite.x-srcx)*500;
	this.knockedTimer = 0.1;
	this.state = SNAKE_HURT;
    }
    var sprite = new PIXI.Sprite(getTextures(MAPTILES)[
	randomChoice(["blood1", "blood2", "blood3"])
    ]);
    sprite.scale.set(SCALE);
    sprite.x = this.sprite.x;
    sprite.y = this.sprite.y-1;
    sprite.zpos = FLOOR_POS;
    sprite.anchor.set(0.5, 0.5);
    level.stage.addChild(sprite);
    return true;
}

/* Other snake-like things */

function Rat()
{
    Snake.call(this);
    this.frames = ["rat_south_1", "rat_south_2"];
    this.deadFrame = "rat_south_dead";
    this.health = 1;
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
    this.frames = ["scorpion_south_1", "scorpion_south_2"];
    this.deadFrame = "scorpion_south_dead";
    this.health = 3;
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
