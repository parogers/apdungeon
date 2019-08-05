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
import { Thing, Hitbox } from './thing';
import { Item } from './item';
import { Audio } from './audio';

// Waiting until the goblin is visible on screen
const STATE_IDLE = 0;
// Approaching the player, but keeping a distance away
const STATE_APPROACH = 1;
// Rushing the player to attack
const STATE_ATTACKING = 2;
// Initiates a jump at the player (transitional state)
const STATE_START_JUMP = 3;
// Jumping at the player to attack
const STATE_JUMPING = 4;
// Knocked back
const STATE_HURT = 5;
const STATE_DEAD = 6;
const STATE_CHANGING_TRACK = 7;

// The goblin's vertical acceleration when falling (after jumping) pixels/s/s
const GRAVITY = 200;

/* The goblin keeps their distance while the player is facing them, and 
 * quickly approaches to attack when the player's back is turned */
export class Goblin extends Thing
{
    constructor()
    {
        super();
        this.name = "Goblin";
        this.idleFrame = Utils.getFrame(RES.ENEMIES, "goblin_south_1");
        this.frames = Utils.getFrames(
            RES.ENEMIES,
            ['goblin_south_2', 'goblin_south_3']
        );
        this.velx = 0;
        this.speed = 14;
        this.health = 3;
        this.frame = 0;
        this.fps = 6;
        this.maxSpeed = 40;
        this.safeDistance = 50;
        // The horizontal and vertical jumping speeds
        this.jumpVerSpeed = 50;
        this.jumpHorSpeed = 24;
        this.dead = false;
        // Our Y-position when we started jumping
        this.jumpStartY = 0;
        // Our current vertical velocity (when jumping)
        this.velh = 0;
        // When approaching the player, how far to keep distance
        this.approachDist = 30;
        // At what distance to the player we should do our jump attack
        this.jumpDist = 20;
        // When in the approach state, used to determine when to jump at
        // the player
        this.jumpTimeout = 1.5;
        this.jumpTimer = 0;
        // The sprite container holding the monster and splash sprite
        this.sprite = new PIXI.Container();
        // The actual goblin sprite
        this.goblinSprite = new PIXI.Sprite(this.frames[0]);
        this.goblinSprite.anchor.set(0.5, 6.5/8);
        this.sprite.addChild(this.goblinSprite);
        // Make the splash/water sprite
        this.waterSprite = Utils.createSplashSprite();
        this.waterSprite.y = -0.75;
        this.sprite.addChild(this.waterSprite);
        this.sprite.scale.set(-1, 1);
        this.knocked = 0;
        this.knockedTimer = 0;
        this.state = STATE_IDLE;
        this.hitbox = new Hitbox(0, -1, 6, 6);
    }

    getDropTable() 
    {
        return [[Item.Table.COIN, 8],
                [Item.Table.SMALL_HEALTH, 6],
                [Item.Table.ARROW, 4],
                [Item.Table.STEEL_ARMOUR, 1],
                [Item.Table.LARGE_BOW, 1]];
    }

    update(dt)
    {
        if (this.state === STATE_IDLE)
        {
            if (this.isOnCamera()) {
                this.state = STATE_APPROACH;
            }
        }
        else if (this.state === STATE_APPROACH)
        {
            // Maintain a safe distance from the player by accelerating
            // back and forth until we're "close enough".
            let targetX = this.level.player.fx + this.safeDistance;
            let buffer = 2;
            let accel = 400;

            if (this.fx < targetX-buffer) this.velx += accel*dt;
            else if (this.fx > targetX+buffer) this.velx -= accel*dt;
            else {
                // Otherwise we're far enough away from the player. Put the
                // breaks otherwise we will annoying oscillate around the
                // target distance which doesn't look good. (this still
                // leaves an oscillation but it's somewhat erratic and looks
                // more natural)
                this.velx -= this.velx*dt;
            }
            // Clamp the velocity so it never moves too fast
            if (this.velx > this.maxSpeed)
            {
                this.velx = this.maxSpeed
            }
            else if (this.velx < -this.maxSpeed)
            {
                this.velx = -this.maxSpeed;
            }
            // Have the goblin bob to make it look more "skittering"
            this.fx += this.velx*dt;
            this.fy = this.track.y + Math.sin(this.frame)/2;
        }
        else if (this.state === STATE_ATTACKING)
        {
        }
        else if (this.state === STATE_RETREATING)
        {
        }

        // Update animation
        this.frame += this.fps*dt;
        let frameNum = (this.frame|0) % this.frames.length;
        this.goblinSprite.texture = this.frames[frameNum];

        /*switch(this.state)
        {
            case STATE_ATTACKING:
            this.updateAttacking(dt);
            break;
            case STATE_START_JUMP:
            // Jump at the player
            this.sprite.zpos = this.sprite.y;
            this.height = 0;
            this.jumpStartY = this.sprite.y;
            this.velh = this.jumpVerSpeed;
            this.waterSprite.visible = false;
            this.state = STATE_JUMPING;
            break;
            case STATE_JUMPING:
            this.updateJumping(dt);
            break;
            case STATE_APPROACH:
            this.updateApproach(dt);
            break;
            case STATE_HURT:
            this.updateHurt(dt);
            break;
            case STATE_DEAD:
            this.level.removeThing(this);
            break;
        }*/
    }

    updateJumping(dt)
    {
        this.velh -= GRAVITY*dt;
        this.height += this.velh*dt;
        if (this.height <= 0) {
            // Hit the ground. Go back to carefully approaching the player. Also
            // we snap the Y-position to the ground to avoid cumulative rounding
            // errors if we jump repeatedly.
            this.sprite.y = this.jumpStartY;
            this.state = STATE_APPROACH;
            return;
        }
        this.sprite.y = this.jumpStartY - this.height;

        // Check if we can move where we want to
        var x = this.sprite.x + this.facing*this.jumpHorSpeed*dt;
        var tile = this.level.getTileAt(x, this.jumpStartY);
        if (!tile.solid) {
            this.sprite.x = x;
        }
    }

    updateAttacking(dt)
    {
        // Rush towards the player
        let player = this.level.player;
        let dx = 0, dy = 0;

        if (player.sprite.x > this.sprite.x) {
            dx = 1.5*this.speed*dt;
            this.facing = 1;
        } else {
            dx = -1.5*this.speed*dt;
            this.facing = -1;
        }
        this.sprite.scale.x = this.facing*Math.abs(this.sprite.scale.x);

        // Go back to a careful approach if the player is facing us (note the
        // goblin always faces the player)
        if (player.getFacing()*this.facing < 0) {
            this.state = STATE_APPROACH;
            return;
        }

        if (Math.abs(this.sprite.x - player.sprite.x) < this.jumpDist) {
            this.state = STATE_START_JUMP;
            return;
        }

        // Move up/down towards the player more slowly (and don't overshoot)
        var dist = player.sprite.y - this.sprite.y;
        if (Math.abs(dist) > 5) {
            dy = dt*20*Math.sign(dist);
        }

        // Check if we can move left/right
        var tile = this.level.getTileAt(this.sprite.x+dx, this.sprite.y);
        if (!tile.solid) {
            this.sprite.x += dx;
            this.waterSprite.visible = tile.water;
        }

        // Now check if it can move up/down. Doing this separately from the check
        // above means we can "slide" along walls and such.
        var tile2 = this.level.getTileAt(this.sprite.x, this.sprite.y+dy);
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

    updateApproach(dt)
    {
        // Move towards the player, but try to keep a fixed distance away. 
        // Initially the target is set to the player's position, plus/minus
        // a fixed offset.
        let player = this.level.player;
        let targetx = 0;

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
        if (player.getFacing()*this.facing > 0) {
            this.state = STATE_ATTACKING;
            return;
        }

        this.jumpTimer += dt;
        if (this.jumpTimer > this.jumpTimeout) {
            this.jumpTimer = 0;
            this.state = STATE_START_JUMP;
            return;
        }

        // Add a bit of variation to the target position, so the goblin kind of
        // waivers back and forth making it a bit harder to hit.
        var dx = 0;
        var dy = 0;
        targetx += 15*Math.cos(this.frame/4);
        if (Math.abs(this.sprite.x-targetx) > 2) {
            dx = this.speed*dt*Math.sign(targetx - this.sprite.x);
        }

        // Move up/down towards the player more slowly (and don't overshoot)
        var dist = (player.sprite.y+50*Math.sin(this.frame/2)) - this.sprite.y;
        if (Math.abs(dist) > 2) {
            dy = dt*30*Math.sign(dist);
        }
        // Check if we can move where we want to
        var tile = this.level.getTileAt(this.sprite.x+dx, this.sprite.y+dy);
        if (!tile.solid) {
            this.sprite.x += dx;
            this.sprite.y += dy;
            this.waterSprite.visible = tile.water;
        }
        this.frame += 4*dt;
        this.goblinSprite.texture = this.frames[(this.frame%this.frames.length)|0];
    }

    updateHurt(dt)
    {
        // Slide backwards from the hit
        if (this.knockedTimer > 0) {
            var dx = this.knocked*dt;
            var tile = this.level.getTileAt(this.sprite.x+dx, this.sprite.y);
            if (!tile.solid) {
                this.sprite.x += dx;
            }
            this.knockedTimer -= dt;
        } else {
            // Resume/start attacking
            this.state = STATE_APPROACH;
            // Also increase the rate of jumping at the player (when approaching)
            this.jumpTimeout *= 0.5;
        }
    }

    handleHit(srcx, srcy, dmg)
    {
        let player = this.level.player;

        if (this.state === STATE_DEAD) return false;
        this.health -= 1;
        if (this.health <= 0) {
            Audio.playSound(RES.DEAD_SND);
            this.state = STATE_DEAD;
            // Drop a reward
            this.level.handleTreasureDrop(
                this.getDropTable(), this.sprite.x, this.sprite.y);
            player.handleMonsterKilled(this);
            this.dead = true;

        } else {
            Audio.playSound(RES.SNAKE_HURT_SND);
            this.knocked = Math.sign(this.sprite.x-srcx)*60;
            this.knockedTimer = 0.1;
            this.state = STATE_HURT;
        }

        // Add some random blood, but only if we're not currently in water
        // (looks better this way)
        var tile = this.level.getTileAt(this.sprite.x, this.sprite.y);
        if (!tile.water) {
            this.level.createBloodSpatter(this.sprite.x, this.sprite.y-1);
        }
        return true;
    }

    handlePlayerCollision(player)
    {
        player.takeDamage(2, this);
    }
}
