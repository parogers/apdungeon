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

import * as PIXI from 'pixi.js';

import { ANIM, RES } from './res';
import { Utils } from './utils';
import { Animation, TrackMover, Thing, Hitbox, Creature } from './thing';
import { Splash, Shadow } from './effects';
import { Item } from './item';
import { Audio } from './audio';
import { DeathAnimation } from './snake';
import { Blood } from './blood';

const STATE_IDLE = 0;
const STATE_CHARGING = 1;
const STATE_RETREAT = 2;
const STATE_DEAD = 3;
const STATE_CHANGE_TRACK = 4;

/* The goblin keeps their distance while the player is facing them, and
 * quickly approaches to attack when the player's back is turned */
export class SkelWarrior extends Creature
{
    constructor()
    {
        super();
        this.name = 'Skeleton';
        this.anim = new Animation(ANIM.SKEL_WARRIOR_WALK);
        this.velx = 0;
        this.vely = 0;
        this.speed = 60;
        this.health = 4;
        this.alwaysChargeDist = 15;
        this.facing = 1;
        this.chargeTimeout = 1;
        this.trackMover = null;
        // When approaching the player, how far to keep distance
        this.approachDist = 30;
        this.counter = 0;
        // The actual goblin sprite
        this.monsterSprite = new PIXI.Sprite();
        this.monsterSprite.anchor.set(0.5, 1);
        this.sprite.addChild(this.monsterSprite);
        this.sprite.scale.x = -1;
        this.shadow = new Shadow(this, Shadow.SMALL);
        this.splash = new Splash(this, 0, false);
        this.knocked = 0;
        // Where the skeleton was (relative to the player) when it started charging
        this.chargeOffset = 0;
        this.timer = this.chargeTimeout;
        this.knockedTimer = 0;
        this.state = STATE_IDLE;
        this.hitbox = new Hitbox(0, -1, 6, 8);
    }

    getDropTable()
    {
        return [[Item.Table.LARGE_HEALTH, 5],
                [Item.Table.LEATHER_ARMOUR, 1],
                [Item.Table.SMALL_BOW, 1]];
    }

    update(dt)
    {
        if (this.dead) {
            return;
        }
        if (this.state === STATE_IDLE)
        {
            this.updateIdle(dt);
        }
        else if (this.state === STATE_CHARGING)
        {
            this.updateCharging(dt);
        }
        else if (this.state === STATE_RETREAT)
        {
            this.updateRetreat(dt);
        }
        else if (this.state === STATE_CHANGE_TRACK)
        {
            this.updateChangeTrack(dt);
        }
        this.monsterSprite.texture = this.anim.update(dt);
        this.splash.update(dt);
        this.shadow.update(dt);
        this.shadow.visible = !this.splash.visible;
    }

    updateIdle(dt)
    {
        const distx = this.level.player.fx - this.x;
        const disty = this.level.player.fy - this.y;
        if (Math.abs(distx) > 25 || Math.abs(disty) > 25) {
            return;
        }
        if (Math.abs(distx) > 5) {
            this.velx = Math.sign(distx)*10;
        } else {
            this.velx = 0;
        }
        if (Math.abs(disty) > 5) {
            this.vely = Math.sign(disty)*15;
        } else {
            this.vely = 0;
        }
        this.x += this.velx*dt;
        this.y += this.vely*dt;
        this.facing = Math.sign(distx);

        // Occasionally either charge the player, or change tracks to find them
        this.timer -= dt;
        if (this.timer <= 0)
        {
            if (
                Math.abs(this.x - this.level.player.fx) < this.alwaysChargeDist &&
                Math.abs(this.y - this.level.player.fy) < 10
            ) {
                this.chargeOffset = this.x - this.level.player.fx;
                this.state = STATE_CHARGING;
            }
            else
            {
                this.timer = this.chargeTimeout;
            }
        }
    }

    // Charging at the player
    updateCharging(dt)
    {
        this.velx = 50*this.facing;
        this.x += this.velx*dt;
        const dist = this.level.player.x - this.x;
        if (Math.sign(dist) !== this.facing && Math.abs(dist) > 20) {
            this.state = STATE_IDLE;
        }
        //
        // if (this.chargeOffset > this.alwaysChargeDist) {
        //     if (this.x <= this.level.player.fx) {
        //         this.state = STATE_RETREAT;
        //     }
        // }
    }

    // Retreating back to a safe distance
    updateRetreat(dt)
    {
        this.velx = this.level.baseSpeed + this.speed/2.0;
        this.x += this.velx*dt;

        if (this.x >= this.level.player.fx + this.chargeOffset)
        {
            this.x = this.level.player.fx + this.chargeOffset;
            this.timer = this.chargeTimeout;
            this.state = STATE_IDLE;
        }
    }

    // Switching tracks to find the player
    updateChangeTrack(dt)
    {
        if (this.trackMover.update(dt))
        {
            this.trackMover = null;
            this.state = STATE_IDLE;
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
                this.getDropTable(), this.x, this.y);
            player.handleMonsterKilled(this);
            this.level.addThing(new DeathAnimation(this));

        } else {
            Audio.playSound(RES.SNAKE_HURT_SND);
        }

        this.level.addThing(
            new Blood(Blood.DUST),
            this.sprite.x,
            this.sprite.y-1
        );
        return true;
    }

    handlePlayerCollision(player)
    {
        if (!this.dead) {
            player.takeDamage(2, this);
        }
    }
}
