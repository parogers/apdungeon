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

import { Thing } from './thing';
import { Level } from './level';
import { Utils } from './utils';
import { Resources, RES } from './res';

export class Blood extends Thing
{
    constructor(type)
    {
        super();
        let frames = null;

        if (type === Blood.DUST) {
            frames = ['dust1', 'dust2', 'dust3', 'dust4'];
        } else {
            frames = ['blood1', 'blood2', 'blood3'];
        }

        this.sprite = new PIXI.Sprite(
            Resources.shared.getFrame(RES.MAP_OBJS, Utils.randomChoice(frames))
        );
        this.sprite.zpos = Level.FLOOR_POS;
        this.sprite.anchor.set(0.5, 0.5);
        this.timer = 0;
    }

    update(dt)
    {
        if (!this.isOnCamera)
        {
            this.level.removeThing(this);
            return;
        }

        this.timer += dt;
        if (this.timer > 0.1)
        {
            let tile = this.level.getTileAt(this.fx, this.fy);
            if (tile.isWater) {
                this.level.removeThing(this);
            }
        }
    }
}

Blood.RED = 0;
Blood.DUST = 1;
