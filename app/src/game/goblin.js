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
import { Shadow, Thing, Hitbox } from './thing';
import { Item } from './item';
import { Audio } from './audio';

// Waiting until the goblin is visible on screen
const STATE_IDLE = 0;
// Approaching the player, but keeping a distance away
const STATE_APPROACH = 1;
// Rushing the player to attack
const STATE_ATTACKING = 2;
// Initiates a jump at the player (transitional state)
const STATE_START_ATTACK = 3;
// Jumping at the player to attack
const STATE_START_RETREAT = 4;
// Knocked back
const STATE_RETREATING = 5;
const STATE_DEAD = 6;
const STATE_CHANGING_TRACK = 7;

// The goblin's vertical acceleration when falling (after jumping) pixels/s/s
const GRAVITY = 200;
// How fast to move when tracking the player
const MAX_SPEED = 40;
// How far to stay away from the player (when not attacking)
const SAFE_DISTANCE = 50;
// How fast the goblin jumps at the player (relative to the player speed)
const ATTACK_SPEED = 60;
const RETREAT_SPEED = ATTACK_SPEED*1.5;

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
        this.velh = 0;
        this.health = 3;
        this.frame = 0;
        this.fps = 6;
        this.maxSpeed = MAX_SPEED;
        this.safeDistance = SAFE_DISTANCE;
        // When in the approach state, used to determine when to jump at
        // the player
        this.attackTimeout = 1.5;
        this.attackTimer = 0;
        // The sprite container holding the monster and splash sprite
        this.sprite = new PIXI.Container();
        // The actual goblin sprite
        this.goblinSprite = new PIXI.Sprite(this.frames[0]);
        this.goblinSprite.anchor.set(0.5, 7/8);
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
        this.shadow = new Shadow(this, Shadow.GOBLIN);
        this.shadow.shadowSprite.anchor.set(0.5, 0);
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
            this.frame = 0;
            if (this.isOnCamera())
            {
                this.state = STATE_APPROACH;
                this.attackTimer = this.attackTimeout*2;
            }
        }
        else if (this.state === STATE_APPROACH)
        {
            this.updateApproach(dt);
        }
        else if (this.state === STATE_START_ATTACK)
        {
            // Calculate how fast we should jump up based on gravity and
            // how fast we're jumping at the player
            let dist = this.fx - this.level.basePos;
            let duration = dist / ATTACK_SPEED;
            this.velx = -ATTACK_SPEED + this.level.baseSpeed;
            this.vely = -duration*GRAVITY/2;
            this.state = STATE_ATTACKING;
            this.fy = this.track.y;
        }
        else if (this.state === STATE_ATTACKING)
        {
            // Jumping at the player
            this.vely += GRAVITY*dt;
            this.fx += this.velx*dt;
            this.fy += this.vely*dt;

            if (this.fy > this.track.y)
            {
                this.fy = this.track.y;
                this.state = STATE_START_RETREAT;
            }
        }
        else if (this.state === STATE_START_RETREAT)
        {
            // Calculate how fast we should jump up based on gravity
            let duration = this.safeDistance / RETREAT_SPEED;
            this.velx = RETREAT_SPEED + this.level.baseSpeed;
            this.vely = -duration*GRAVITY/2;
            this.state = STATE_RETREATING;
        }
        else if (this.state === STATE_RETREATING)
        {
            // Jumping at the player
            this.vely += GRAVITY*dt;
            this.fx += this.velx*dt;
            this.fy += this.vely*dt;

            if (this.fy > this.track.y)
            { 
                this.fy = this.track.y;
                this.state = STATE_APPROACH;
                this.attackTimer = this.attackTimeout;
            }
        }

        this.shadow.update(dt);

        // Update animation
        let frameNum = (this.frame|0) % this.frames.length;
        this.goblinSprite.texture = this.frames[frameNum];
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

    updateApproach(dt)
    {
        // Maintain a safe distance from the player by accelerating
        // back and forth until we're "close enough".
        let targetX = this.level.basePos + this.safeDistance;
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
        // Clamp the velocity so we never moves too fast
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
        this.frame += this.fps*dt;

        this.attackTimer -= dt;
        if (this.attackTimer <= 0)
        {
            this.state = STATE_START_ATTACK;
        }
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
            // Also increase the rate of jumping at the player
            // (when approaching)
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
