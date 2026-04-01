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

import { Resources, RES } from './res';
import { Utils } from './utils';
import { Thing, Hitbox } from './thing';

/**************/
/* GroundItem */
/**************/

export class GroundItem extends Thing
{
    constructor(item, x, y, h)
    {
        super();
        let img = Resources.shared.getFrame(item.image);
        this.sprite = new PIXI.Sprite(img);
        this.sprite.anchor.set(0.5, 0.6);
        this.x = x ?? 0;
        this.y = y ?? 0;
        this.fh = h ?? 0;
        this.item = item;
        this.velx = 0;
        this.vely = 0;
        this.velh = 0;
        this.bouncy = 0.5;
        this.hitbox = new Hitbox(0, 0, 5, 5);
        this.taking = false;
    }

    get falling() {
        return !this.taking && (this.fh > 0 || this.velh !== 0);
    }

    update(dt)
    {
        if (this.falling)
        {
            // // First move the item into/out of the scene (Z-axis) and make sure
            // // we don't bump into anything.
            // if (this.velz !== 0) {
            //     let dz = this.velz*dt;
            //     let tile = this.level.getTileAt(this.sprite.x, this.ypos+dz);
            //     // If we connect with a wall, don't bother bouncing off
            //     if (tile.solid) this.velz = 0;
            //     else {
            //         this.ypos += dz;
            //         this.sprite.zpos += dz;
            //     }
            // }
            //
            // // Move the item left/right having it bounce off walls too. Note we
            // // check the "floor" position of the item instead of the sprite pos.
            // let dx = this.velx*dt;
            // let tile = this.level.getTileAt(this.sprite.x+dx, this.ypos);
            // if (tile.solid) {
            //     this.velx *= -1;
            // } else {
            //     this.sprite.x += dx;
            // }

            // Have the item bounce up/down until it comes to rest
            this.fh += this.velh*dt;
            if (this.fh <= 0 && Math.abs(this.velh) < 10) {
                this.velh = 0;
                this.fh = 0;
            } else if (this.fh <= 0 && this.velh < 0) {
                this.velh *= -this.bouncy;
                this.fh = 0;
            } else {
                this.velh -= this.level.gravity*dt;
            }
        }
        this.fx += this.velx*dt;
        this.fy += this.vely*dt;
        if (!this.taking && this.fh === 0) {
            const friction = 30;
            this.velx -= Math.sign(this.velx)*friction*dt;
            this.vely -= Math.sign(this.vely)*friction*dt;
            if (Math.abs(this.velx) < 1) {
                this.velx = 0;
            }
            if (Math.abs(this.vely) < 1) {
                this.vely = 0;
            }
        }
    }

    handlePlayerCollision(player)
    {
        if (!this.taking && this.item && player.handleTakeItem(this.item))
        {
            this.velx = 1.5*player.velx*Utils.randUniform(1, 1.1);
            this.vely = -40*Utils.randUniform(1, 1.2);
            this.accelx = 0;
            this.accely = 0;
            this.taking = true;
        }
    }
}
