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

import { ANIM, RES, getFrame } from './res';
import { TrackMover, Animation, Thing } from './thing';
import { Utils } from './utils';

const ADVANCE_TIMEOUT = 5;
const ADVANCE_SPEED = 50;
const FIRE_DISTANCE = 26;
const IDLE_DISTANCE = 70;

const STATE_IDLE = 0;
const STATE_KEEP_DIST = 1;
const STATE_CHANGING_TRACK = 2;
const STATE_ATTACK = 3;
const STATE_APPROACH = 4;

class Timer
{
    constructor()
    {
        this.lastCount = 0;
        this.count = 0;
    }

    restart()
    {
        this.lastCount = 0;
        this.count = 0;
    }

    hasReached(value)
    {
        return value >= this.lastCount && value <= this.count;
    }

    isBetween(a, b, every)
    {
        if (this.count < a || this.lastCount > b) {
            return false;
        }
        if (!every) {
            return true;
        }
        let last = Math.floor((this.lastCount-a)/every);
        let current = Math.floor((this.count-a)/every);
        return last !== current;
    }

    update(dt) {
        this.lastCount = this.count;
        this.count += dt;
    }
}

export class Dragon extends Thing
{
    constructor()
    {
        super();
        this.walkAnim = new Animation(ANIM.DRAGON_WALK);
        this.openMouthAnim = new Animation(ANIM.DRAGON_MOUTH_OPEN);
        this.closeMouthAnim = new Animation(ANIM.DRAGON_MOUTH_CLOSED);
        this.fireSprite = new PIXI.Sprite(
            getFrame(ANIM.DRAGON_FIRE)
        );
        this.anim = this.walkAnim;
        this.fireSprite.anchor.set(1, 0);
        this.fireSprite.x = -17;
        this.fireSprite.y = -9;
        this.fireSprite.visible = false;
        this.bodySprite = new PIXI.Sprite(this.anim.texture);
        this.bodySprite.anchor.set(0.65, 0.95);

        this.shadowSprite = new PIXI.Sprite(
            Utils.getFrame(RES.DRAGON, 'dragon-shadow.png')
        );
        this.shadowSprite.anchor.set(0.5, 0.4);
        
        this.sprite.addChild(this.shadowSprite);
        this.sprite.addChild(this.bodySprite);
        this.sprite.addChild(this.fireSprite);

        this.trackMover = null;
        this.timer = new Timer();
        this.state = STATE_IDLE;
    }

    get player() {
        return this.level.player;
    }

    update(dt)
    {
        this.fx += this.level.baseSpeed*dt;

        if (this.timer) this.timer.update(dt);

        if (this.state === STATE_IDLE)
        {
            // Idling in front of the player
            this.timer.restart();
            this.state = STATE_KEEP_DIST;
        }
        else if (this.state === STATE_KEEP_DIST)
        {
            // Maintain a distance away from the player
            let targetX = this.player.fx + IDLE_DISTANCE;

            this.anim = this.walkAnim;
            if (this.fx < targetX)
            {
                this.fx = Math.min(this.fx + ADVANCE_SPEED*dt, targetX);
            }
            else if (this.fx > targetX)
            {
                this.fx = Math.max(this.fx - ADVANCE_SPEED*dt, targetX);
            }
            if (this.timer.hasReached(5))
            {
                this.state = STATE_APPROACH;
            }
        }
        else if (this.state === STATE_APPROACH)
        {
            // Approaching the player
            this.anim = this.walkAnim;
            this.fx -= ADVANCE_SPEED*dt;
            if (this.fx - this.player.fx < FIRE_DISTANCE)
            {
                this.fx = this.player.fx + FIRE_DISTANCE;
                this.state = STATE_ATTACK;
                this.timer.restart();
            }
        }
        else if (this.state === STATE_ATTACK)
        {
            if (this.timer.hasReached(0.5))
            {
                this.anim = this.openMouthAnim;
            }
            else if (this.timer.hasReached(0.75))
            {
                this.fireSprite.visible = true;
            }
            else if (this.timer.isBetween(0.75, 3.75, 0.5))
            {
                // Inflict fire damage on the player over time
                this.player.takeDamage(2, this);
            }
            else if (this.timer.hasReached(4))
            {
                this.fireSprite.visible = false;
            }
            else if (this.timer.hasReached(4.25))
            {
                this.state = STATE_IDLE;
            }
        }
        this.bodySprite.texture = this.anim.update(dt);
    }
}
