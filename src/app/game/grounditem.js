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

import { RES } from './res';
import { Utils } from './utils';
import { Thing, Hitbox } from './thing';

const ITEM_GRAVITY = 120;

/**************/
/* GroundItem */
/**************/

export class GroundItem
{
    constructor(item, x, y)
    {
        let img = Utils.getFrame(RES.GROUND_ITEMS, item.image);
        this.sprite = new PIXI.Sprite(img);
        this.sprite.anchor.set(0.5, 0.6);
        this.height = 0;
        this.sprite.x = x;
        this.sprite.y = y;
        this.ypos = y;
        this.item = item;
        // Make the render depth fixed here, otherwise as the item bounces it
        // will seem like it's moving back into the scene. (ie disappears behind
        // other sprites)
        this.sprite.zpos = y;
        this.velx = 0;
        this.vely = 0;
        this.accely = 0;
        this.accelx = 0;
        this.bouncy = 0.5;
        this.hitbox = new Hitbox(0, 0, 5, 5);

        this.taking = false;
    }

    update(dt)
    {
        this.velx += this.accelx*dt;
        this.vely += this.accely*dt;

        this.sprite.x += this.velx*dt;
        this.sprite.y += this.vely*dt;

        /*
          if (this.velh !== 0)
          {
          // First move the item into/out of the scene (Z-axis) and make sure
          // we don't bump into anything.
          if (this.velz !== 0) {
          let dz = this.velz*dt;
          let tile = this.level.getTileAt(this.sprite.x, this.ypos+dz);
          // If we connect with a wall, don't bother bouncing off
          if (tile.solid) this.velz = 0;
          else {
          this.ypos += dz;
          this.sprite.zpos += dz;
          }
          }

          // Move the item left/right having it bounce off walls too. Note we
          // check the "floor" position of the item instead of the sprite pos.
          let dx = this.velx*dt;
          let tile = this.level.getTileAt(this.sprite.x+dx, this.ypos);
          if (tile.solid) {
          this.velx *= -1;
          } else {
          this.sprite.x += dx;
          }
          this.velh += ITEM_GRAVITY*dt;
          this.height -= this.velh*dt;

          // Have the item bounce up/down until it comes to rest
          if (this.height <= 0) {
          if (this.velh < 10) {
          this.velh = 0;
          } else {
          this.velh *= -this.bouncy;
          this.height = 0;
          }
          }
          this.sprite.y = this.ypos - this.height;
          }*/
    }

    handlePlayerCollision(player)
    {
        if (!this.taking && this.item && player.handleTakeItem(this.item))
        {
            this.velx = 2*player.velx;
            this.vely = -40;
            this.accelx = -20;
            this.accely = -20;
            this.taking = true;
        }
        if (this.sprite.y < -this.sprite.height) {
            this.removeSelf();
        }
    }
}
