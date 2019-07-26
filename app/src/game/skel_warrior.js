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
import { DeathAnimation } from './snake';

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

var STATE_IDLE = 0;
var STATE_CHARGING = 1;
var STATE_RETREAT = 2;
var STATE_DEAD = 3;
var STATE_CHANGE_TRACK = 4;

/* The goblin keeps their distance while the player is facing them, and 
 * quickly approaches to attack when the player's back is turned */
export class SkelWarrior
{
    constructor()
    {
        this.name = "Skeleton";
        this.idleFrame = Utils.getFrame(RES.ENEMIES, "skeleton_warrior_south_1");
        this.frames = Utils.getFrames(RES.ENEMIES, [
            'skeleton_warrior_south_2',
            'skeleton_warrior_south_3',
        ]);
        this.velx = 0;
        this.vely = 0;
        this.speed = 60;
        this.health = 3;
        this.alwaysChargeDist = 24;
        this.frame = 0;
        this.facing = 1;
        this.chargeTimeout = 1;
        // Which level Track this monster occupies
        this.track = null;
        this.nextTrack = null;
        // When approaching the player, how far to keep distance
        this.approachDist = 30;
        this.counter = 0;
        // The sprite container holding the monster and splash sprite
        this.sprite = new PIXI.Container(this.frames[0]);
        // The actual goblin sprite
        this.monsterSprite = new PIXI.Sprite();
        this.monsterSprite.anchor.set(0.5, 1);
        this.sprite.addChild(this.monsterSprite);
        this.sprite.scale.x = -1;
        // Make the splash/water sprite
        this.waterSprite = Utils.createSplashSprite();
        this.waterSprite.y = -0.5;
        this.sprite.addChild(this.waterSprite);
        this.knocked = 0;
        // Where the skeleton was (relative to the player) when it started charging
        this.chargeOffset = 0;
        this.timer = this.chargeTimeout;
        this.knockedTimer = 0;
        this.state = STATE_IDLE;
        this.hitbox = new Hitbox(0, -1, 6, 8);
    }

    setTrack(track, x)
    {
        this.track = track;
        this.sprite.x = x;
        this.sprite.y = track.y;
        this.nextTrack = null;
    }

    getDropTable() 
    {
        return [[Item.Table.LARGE_HEALTH, 5],
                [Item.Table.LEATHER_ARMOUR, 1],
                [Item.Table.SMALL_BOW, 1]];
    }

    update(dt)
    {
        if (this.state === STATE_IDLE && this.level.player.running)
        {
            // Facing the player, but slowly moving towards them
            this.velx = this.level.player.velx*0.9;
            this.sprite.x += this.velx*dt;

            // Occasionally either charge the player, or change tracks to find them
            this.timer -= dt;
            if (this.timer <= 0)
            {
                if (this.level.player.track === this.track ||
                    this.sprite.x < this.level.player.sprite.x + this.alwaysChargeDist)
                {
                    this.chargeOffset = this.sprite.x - this.level.player.sprite.x;
                    this.state = STATE_CHARGING;
                }
                else if (this.level.player.track)
                {
                    // Move towards the player
                    if (this.level.player.track.number < this.track.number) {
                        this.nextTrack = this.level.getTrackAbove(this.track);
                    } else {
                        this.nextTrack = this.level.getTrackBelow(this.track);
                    }
                    this.state = STATE_CHANGE_TRACK;
                    this.timer = this.chargeTimeout;
                }
                else
                {
                    this.timer = this.chargeTimeout;
                }
            }
        }
        else if (this.state === STATE_CHARGING)
        {
            this.velx = this.level.player.velx - this.speed;
            this.sprite.x += this.velx*dt;

            if (this.chargeOffset > this.alwaysChargeDist) {
                if (this.sprite.x <= this.level.player.sprite.x) {
                    this.state = STATE_RETREAT;
                }
            }
            else
            {
                if (this.sprite.x + this.monsterSprite.texture.width < 0) {
                    this.level.removeThing(this);
                }
            }
        }
        else if (this.state === STATE_RETREAT)
        {
            this.velx = this.level.player.velx + this.speed/2.0;
            this.sprite.x += this.velx*dt;

            if (this.sprite.x >= this.level.player.sprite.x + this.chargeOffset)
            {
                this.sprite.x = this.level.player.sprite.x + this.chargeOffset;
                this.timer = this.chargeTimeout;
                this.state = STATE_IDLE;
            }
        }
        else if (this.state === STATE_CHANGE_TRACK)
        {
            let vely = 0;
            if (this.nextTrack.y > this.track.y) {
                vely = this.speed;
            } else {
                vely = -this.speed;
            }
            this.sprite.y += vely*dt;

            if ((vely >= 0 && this.sprite.y > this.nextTrack.y) ||
                (vely < 0 && this.sprite.y < this.nextTrack.y))
            {
                this.setTrack(this.nextTrack, this.sprite.x);
                this.state = STATE_IDLE;
            }
        }

        this.frame += 4*dt;
        let frameNum = this.frame % this.frames.length;
        this.monsterSprite.texture = this.frames[frameNum|0];
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
            this.level.addThing(new DeathAnimation(this));

        } else {
            Audio.playSound(RES.SNAKE_HURT_SND);
        }

        // Add some random dust, but only if we're not currently in water
        var tile = this.level.getTileAt(this.sprite.x, this.sprite.y);
        if (!tile.water) {
            this.level.createBloodSpatter(
                this.sprite.x, this.sprite.y-1,
                ["dust1", "dust2", "dust3", "dust4"]);
        }
        return true;
    }

    handlePlayerCollision(player)
    {
        player.takeDamage(2, this);
    }
}
