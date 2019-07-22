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

import { Gate } from './gate';
import { Utils } from './utils';
import { RES } from './res';

/* A door is basically a gate with different graphics, and an extra sprite
 * behind it so when the door opens, it shows darkness behind it. */
export function Door()
{
    Gate.call(this);
    this.frames = [
        Utils.getFrame(RES.MAP_OBJS, "door1"),
        Utils.getFrame(RES.MAP_OBJS, "door2"),
        Utils.getFrame(RES.MAP_OBJS, "door3"),
        Utils.getFrame(RES.MAP_OBJS, "door4")
    ];
    this.fps = 3;
    this.sprite.anchor.set(0.5,1);
    this.sprite.texture = this.frames[0];
}

Door.prototype = Object.create(Gate.prototype);

