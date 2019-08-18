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

import { ANIM, RES } from './res';
import { Utils } from './utils';
import { Animation, Thing, Hitbox } from './thing';
import { GameControls } from './controls';
import { Audio } from './audio';

export class Gate extends Thing
{
    constructor() 
    {
        super();
        this.openingAnim = new Animation(ANIM.GATE_OPENING);
        this.closingAnim = new Animation(ANIM.GATE_CLOSING);
        this.anim = this.openingAnim;
        this.anim.stop();
        this.hitbox = new Hitbox(0, 0, 5, 5);
        this.sprite = new PIXI.Sprite(this.anim.texture);
        this.sprite.anchor.set(0,0);
        this.frameNum = 0;
        this.moving = 0;
    }

    isOpen()
    {
        return this.anim === this.openingAnim && this.anim.done;
    }

    startOpening()
    {
        this.anim = this.openingAnim;
        this.anim.start(0);
    }

    startClosing()
    {
        this.anim = this.closingAnim;
        this.anim.start(0);
    }

    update(dt)
    {
        // The gate is opening or closing
        let oldFrame = (2*this.anim.frame)|0;
        this.sprite.texture = this.anim.update(dt);

        let frame = (2*this.anim.frame)|0;
        if (this.anim.playing && !this.anim.done && frame !== oldFrame) {
            Audio.playSound(RES.GATE_SND, 0.2);
        }
    }

    handleHit(x, y, dmg)
    {
    }

    handlePlayerCollision(player)
    {
        if (this.isOpen() && 
            this === this.level.exitDoor && 
            GameControls.getControls().up && 
            Math.abs(player.sprite.y-this.sprite.y) < 5) 
        {
            // Next level
            this.level.state = this.level.FINISHED;
        }
    }
}
