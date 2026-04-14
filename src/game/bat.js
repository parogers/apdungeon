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

import { Resources, ANIM, RES } from './res';
import { Utils } from './utils';
import { Animation, Thing, Hitbox, Creature } from './thing';
import { Monster } from './monster';
import { Shadow } from './effects';
import { Item } from './item';
import { Audio } from './audio';
import { DeathAnimation } from './snake';

const STATE_IDLE = 0;
const STATE_START_ATTACK = 1;
const STATE_ATTACKING = 2;

export class Bat extends Monster
{
    constructor()
    {
        super();
        this.state = STATE_IDLE;
        this.health = 1;
        this.moveAnim = new Animation(ANIM.BAT_FLYING);
        this.hitbox = new Hitbox(0, 0, 3, 3);
        this.shadow = new Shadow(this, Shadow.MEDIUM);
        this.velh = 0;
        this.bodySprite.anchor = this.moveAnim.anchors[0];
        this.flyTimer = 0;
        this.targetH = 10;
        this.fh = 0;
        this.climbing = true;
        this.onGround = false;
    }

    update(dt)
    {
        if (this.dead) {
            this.velx = 0;
            this.vely = 0;
            if (this.fh > 0) {
                this.fh += this.velh*dt;
                this.velh -= this.level.gravity*dt;
                if (this.fh < 0) {
                    this.fh = 0;
                }
            }
            this.shadow.update();
            return;
        }
        if (this.state === STATE_IDLE) {
            function clamp(value, minValue, maxValue) {
                const clamped = Math.min(
                    Math.max(
                        Math.abs(value),
                        minValue
                    ),
                    maxValue
                );
                return Math.sign(value)*clamped;
            }
            this.flyTimer += dt;
            this.velx = 15*Math.cos(this.flyTimer);
            this.vely = 7*Math.cos(this.flyTimer/2);

            this.targetH = 12 + 4*Math.sin(this.flyTimer);
            const w = Math.min(1, 2*dt);
            this.fh = (1-w)*this.fh + w*this.targetH;

            super.update(dt);
            this.shadow.update();
            this.bodySprite.texture = this.moveAnim.update(dt);
            this.timer -= dt;
            if (this.getDistanceTo(this.level.player) < 32 && this.timer <= 0 && this.fh >= this.targetH) {
                this.state = STATE_START_ATTACK;
                this.timer = 1;
            }
        } else if (this.state === STATE_START_ATTACK) {
            this.bodySprite.texture = this.moveAnim.update(dt);
            this.velx *= 0.95;
            this.vely *= 0.95;
            super.update(dt);
            this.timer -= dt;
            if (this.timer <= 0) {
                this.state = STATE_ATTACKING;
                const dir = this.level.player.position.subtract(this.position);
                const diveSpeed = 100;
                const vel = dir.normalize().multiplyScalar(diveSpeed);
                this.velx = vel.x;
                this.vely = vel.y;
                this.velh = -(this.fh-2)/(dir.magnitude()/diveSpeed);
            }
        } else if (this.state === STATE_ATTACKING) {
            super.update(dt);
            this.shadow.update();
            if (this.fh < 2) {
                this.velh = 0;
                this.timer = 2;
                this.state = STATE_IDLE;
            }
        }
    }

    handlePlayerCollision(player)
    {
        if (!this.dead && this.state === STATE_ATTACKING) {
            player.takeDamage(1, this);
        }
    }

    getDropTable()
    {
        return [
            [[Item.Table.COIN, Item.Table.COIN], 1],
            [[Item.Table.COIN], 1],
        ];
    }
};
