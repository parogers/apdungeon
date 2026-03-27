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
import { Animation, Thing, Hitbox, Creature } from './thing';
import { Monster } from './monster';
import { Shadow } from './effects';
import { Item } from './item';
import { Audio } from './audio';
import { DeathAnimation } from './snake';

const STATE_FLYING = 0;
const STATE_DEAD = 1;

export class Bat extends Monster
{
    constructor()
    {
        super();
        this.state = STATE_FLYING;
        this.health = 1;
        this.moveAnim = new Animation(ANIM.BAT_FLYING);
        this.bodySprite = new PIXI.Sprite();
        this.bodySprite.anchor.set(0.5, 0.5);
        this.sprite.addChild(this.bodySprite);
        this.sprite.scale.set(-1, 1);
        this.hitbox = new Hitbox(0, 0, 3, 3);
        this.shadow = new Shadow(this, Shadow.MEDIUM);
    }

    update(dt)
    {
        this.velx = 0;
        this.vely = 0;
        this.fh = 8;
        super.update(dt);
        if (this.state === STATE_DEAD) {
            return;
        }
        this.shadow.update();
        this.bodySprite.texture = this.moveAnim.update(dt);
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
            /*// Drop a reward
            this.level.handleTreasureDrop(
                this.getDropTable(),
                this.sprite.x,
                this.sprite.y
            );*/
            this.level.player.handleMonsterKilled(this);
            this.level.addThing(new DeathAnimation(this));
        }
        else
        {
            Audio.playSound(RES.SNAKE_HURT_SND);
        }
        return true;
    }

    handlePlayerCollision(player)
    {
        if (!this.dead) {
            player.takeDamage(1, this);
        }
    }
};
