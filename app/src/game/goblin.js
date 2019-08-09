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
import { TrackMover, Shadow, Thing, Hitbox } from './thing';
import { Item } from './item';
import { Audio } from './audio';
import { DeathAnimation } from './snake';

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
const STATE_RETREATING = 5;
const STATE_DEAD = 6;
const STATE_CHANGE_TRACK = 7;

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
        this.trackMover = null;
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
            this.velh = duration*GRAVITY/2;
            this.state = STATE_ATTACKING;
            this.fy = this.track.y;
        }
        else if (this.state === STATE_ATTACKING)
        {
            // Jumping at the player
            this.velh -= GRAVITY*dt;
            this.fx += this.velx*dt;
            this.fh += this.velh*dt;

            if (this.fh <= 0)
            {
                this.fh = 0;
                this.state = STATE_START_RETREAT;
            }
        }
        else if (this.state === STATE_START_RETREAT)
        {
            // Calculate how fast we should jump up based on gravity
            let duration = this.safeDistance / RETREAT_SPEED;
            this.velx = RETREAT_SPEED + this.level.baseSpeed;
            this.velh = duration*GRAVITY/2;
            this.state = STATE_RETREATING;
        }
        else if (this.state === STATE_RETREATING)
        {
            // Jumping at the player
            this.velh -= GRAVITY*dt;
            this.fx += this.velx*dt;
            this.fh += this.velh*dt;

            if (this.fh <= 0)
            { 
                this.fh = 0;
                this.state = STATE_APPROACH;
                this.attackTimer = this.attackTimeout;
            }
        }
        else if (this.state === STATE_CHANGE_TRACK)
        {
            this.fx += this.level.baseSpeed*dt;
            if (this.trackMover.update(dt))
            {
                this.trackMover = null;
                this.state = STATE_APPROACH;
                this.attackTimer = this.attackTimeout;
            }
        }

        this.shadow.update(dt);

        // Update animation
        let frameNum = (this.frame|0) % this.frames.length;
        this.goblinSprite.texture = this.frames[frameNum];
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
            if (this.level.player.track === this.track)
            {
                this.state = STATE_START_ATTACK;
            }
            else
            {
                this.state = STATE_CHANGE_TRACK;
                this.trackMover = new TrackMover(
                    this,
                    this.level.player.track,
                    this.maxSpeed,
                    GRAVITY*2
                );
            }
        }
    }

    handleHit(srcx, srcy, dmg)
    {
        if (this.state === STATE_DEAD) {
            return false;
        }

        this.health -= 1;
        if (this.health <= 0)
        {
            Audio.playSound(RES.DEAD_SND);
            this.state = STATE_DEAD;
            // Drop a reward
            this.level.handleTreasureDrop(
                this.getDropTable(),
                this.sprite.x,
                this.sprite.y
            );
            this.level.player.handleMonsterKilled(this);
            this.level.addThing(new DeathAnimation(this));
        }
        else
        {
            Audio.playSound(RES.SNAKE_HURT_SND);
        }

        // Add some random blood, but only if we're not currently in water
        // (looks better this way)
        let tile = this.level.getTileAt(
            this.sprite.x,
            this.sprite.y
        );
        if (!tile.water)
        {
            this.level.createBloodSpatter(
                this.sprite.x,
                this.sprite.y-1
            );
        }
        return true;
    }

    handlePlayerCollision(player)
    {
        player.takeDamage(2, this);
    }
}
