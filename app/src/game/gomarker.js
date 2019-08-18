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
import { Audio } from './audio';

/* TODO - this code would be cleaner if we implemented an event queue/message
 * passing system. The level instance could broadcast changes in it's state,
 * (eg wait-to-advance) which would be picked up by the go marker, who could
 * then change it's appearance accordingly (eg play go animation) */

export function GoMarker(screen)
{
    this.screen = screen;
    this.frames = [
        Utils.getFrame(RES.UI, 'go1'), 
        Utils.getFrame(RES.UI, 'go2')
    ];
    this.sprite = new PIXI.Sprite(this.frames[0]);
    this.sprite.anchor.set(1,0);
    this.timer = 0;
    this.dings = 3;
    this.frameNum = 0;
    this.done = true;
    this.sprite.visible = false;
}

GoMarker.prototype.show = function()
{
    this.done = false;
    this.timer = 0;
    this.dings = 3;
    this.frameNum = 0;
    this.sprite.visible = true;
    this.sprite.texture = this.frames[0];
}

GoMarker.prototype.hide = function()
{
    this.done = true;
    this.sprite.visible = false;
}

GoMarker.prototype.update = function(dt)
{
    let level = this.screen.level;
    if (!this.sprite.visible) {
        // Become visible if the level is ready to advance to the next arena
        if (level.state === level.SHOWING_GO) {
            this.show();
        }
        return;
    }

    if (this.done) {
        // Hide when the player is advancing to the next arena
        if (level.state !== level.SHOWING_GO) {
            this.hide();
        }
        return;
    }

    let next = this.timer + dt;
    if (this.timer < 0.3 && next >= 0.3) {
        if (this.dings-- > 0) Audio.playSound(RES.GO_SND);
        else this.done = true;
        this.frameNum = 1;
    } else if (this.timer < 1 && next >= 1) {
        this.frameNum = 0;
        next = 0;
    }
    this.timer = next;
    this.sprite.texture = this.frames[this.frameNum];
}

GoMarker.prototype.handleHit = function(x, y, dmg)
{
}

GoMarker.prototype.handlePlayerCollision = function(player)
{
}

