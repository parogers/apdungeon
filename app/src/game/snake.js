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

import { RES } from './res';
import { Utils } from './utils';
import { Thing } from './thing';
import { Item } from './item';
import { Audio } from './audio';

/*********/
/* Snake */
/*********/

var SNAKE_IDLE = 0;
var SNAKE_ATTACKING = 1;
var SNAKE_HURT = 2;
var SNAKE_DEAD = 3;

export function Snake(state)
{
    this.name = "Snake";
    this.frames = Utils.getFrames(RES.ENEMIES, Snake.FRAMES);
    this.speed = 16;
    this.health = 3;
    this.frame = 0;
    this.facing = 1;
    this.dead = false;
    this.travel = 0;
    // The sprite container holding the snake and splash sprite
    this.sprite = new PIXI.Container();
    // The actual snake sprite
    this.snakeSprite = new PIXI.Sprite(this.frames[0]);
    this.snakeSprite.anchor.set(0.5, 6.5/8);
    this.sprite.addChild(this.snakeSprite);
    // Make the splash/water sprite
    this.waterSprite = Utils.createSplashSprite();
    this.waterSprite.y = -1.25;
    this.sprite.addChild(this.waterSprite);
    this.knocked = 0;
    this.knockedTimer = 0;
    this.state = state || SNAKE_ATTACKING;
    this.hitbox = new Thing.Hitbox(0, -1, 6, 6);
}

Snake.FRAMES = ["snake_south_1", "snake_south_2"];

Snake.prototype.getDropTable = function() 
{
    return [[Item.Table.COIN, 2],
            [Item.Table.ARROW, 1],
            [Item.Table.SMALL_HEALTH, 1]];
}

Snake.prototype.update = function(dt)
{
    if (this.state === SNAKE_IDLE) this.updateIdle(dt);
    else if (this.state === SNAKE_ATTACKING) this.updateAttacking(dt);
    else if (this.state === SNAKE_HURT) this.updateHurt(dt);
    else if (this.state === SNAKE_DEAD) {
        this.level.removeThing(this);
    }
}

Snake.prototype.updateIdle = function(dt)
{
    let player = this.level.player;
    this.frame += 2*dt;
    this.snakeSprite.texture = this.frames[(this.frame%this.frames.length)|0];

    // Turn left/right searching for the player
    this.facing = Math.sign(Math.cos(this.frame/10));
    this.sprite.scale.x = this.facing*Math.abs(this.sprite.scale.x);

    // Start attacking the player when they're close enough, and when
    // the snake is facing them.
    if (Math.abs(player.sprite.x-this.sprite.x) < this.level.camera.width/3 &&
        this.facing*(player.sprite.x - this.sprite.x) > 0) 
    {
        this.state = SNAKE_ATTACKING;
    }
}

Snake.prototype.updateAttacking = function(dt)
{
    let dx = 0, dy = 0;
    let player = this.level.player;

    // Move towards the player for a bit. Note the snake moves in "steps"
    // so it will occasionally overshot the player before moving back again.
    if (this.travel > 0) {
        dx = this.speed*dt*this.facing;
        this.sprite.scale.x = this.facing*Math.abs(this.sprite.scale.x);
        this.travel -= Math.abs(dx);
    } else {
        if (player.sprite.x < this.sprite.x) this.facing = -1;
        else this.facing = 1;
        this.travel = Utils.randint(16, 20);
    }

    // Move up/down towards the player more slowly (and don't overshoot)
    var dist = player.sprite.y - this.sprite.y;
    if (Math.abs(dist) > 5) {
        dy = dt*Math.sign(dist)*this.speed/2;
    }

    // Check if the snake can move left/right
    var tile = this.level.bg.getTileAt(this.sprite.x+dx, this.sprite.y);
    if (!tile.solid) {
        this.sprite.x += dx;
        this.waterSprite.visible = tile.water;
    }

    // Now check if it can move up/down. Doing this separately from the check
    // above means we can "slide" along walls and such.
    var tile2 = this.level.bg.getTileAt(this.sprite.x, this.sprite.y+dy);
    if (!tile2.solid) {
        // Go a bit faster if we're just moving up/down
        if (tile.solid) this.sprite.y += 1*dy;
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
        var tile = this.level.bg.getTileAt(this.sprite.x+dx, this.sprite.y);
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
    let player = this.level.player;
    if (this.state === SNAKE_DEAD) return false;
    this.health -= 1;
    if (this.health <= 0) {
        Audio.playSound(RES.DEAD_SND);
        this.state = SNAKE_DEAD;
        // Drop a reward
        this.level.handleTreasureDrop(
            this.getDropTable(), this.sprite.x, this.sprite.y);
        player.handleMonsterKilled(this);
        this.dead = true;

    } else {
        Audio.playSound(RES.SNAKE_HURT_SND);
        this.knocked = Math.sign(this.sprite.x-srcx)*60;
        this.knockedTimer = 0.1;
        this.state = SNAKE_HURT;
    }

    // Add some random blood, but only if we're not currently in water
    // (looks better this way)
    var tile = this.level.bg.getTileAt(this.sprite.x, this.sprite.y);
    if (!tile.water) {
        this.level.createBloodSpatter(this.sprite.x, this.sprite.y-1);
    }
    return true;
}

Snake.prototype.handlePlayerCollision = function(player)
{
    player.takeDamage(1, this);
}

/* Other snake-like things */

/*******/
/* Rat */
/*******/

export function Rat()
{
    Snake.call(this);
    this.name = "Rat";
    this.frames = Utils.getFrames(RES.ENEMIES, Rat.FRAMES);
    this.health = 1;
    this.speed = 20;
    this.frame = 0;
    this.facing = 1;
    this.travel = 20;
    this.knocked = 0;
    this.knockedTimer = 0;
    this.state = SNAKE_ATTACKING;
    this.snakeSprite.texture = this.frames[0];
    this.waterSprite.y = -0.9;
}

Rat.FRAMES = ["rat_south_1", "rat_south_2"];

Rat.prototype = Object.create(Snake.prototype);

/************/
/* Scorpion */
/************/

export function Scorpion()
{
    Snake.call(this);
    this.name = "Scorpion";
    this.frames = Utils.getFrames(RES.ENEMIES, Scorpion.FRAMES);
    this.health = 4;
    this.speed = 10;
    this.frame = 0;
    this.facing = 1;
    this.travel = 20;
    this.knocked = 0;
    this.knockedTimer = 0;
    this.state = SNAKE_ATTACKING;
    this.snakeSprite.texture = this.frames[0];
    this.waterSprite.y = -0.85;
}

Scorpion.FRAMES = ["scorpion_south_1", "scorpion_south_2"];

Scorpion.prototype = Object.create(Snake.prototype);
