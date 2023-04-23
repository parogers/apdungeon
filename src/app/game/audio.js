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

var enabled = true;

export var Audio = {};

Audio.playSound = function(res, vol)
{
    if (enabled) {
        const sound = window.assetsBundle[res];
        if (sound) {
            sound.play({
                volume: vol || 1,
            });
        }
    }
}

Audio.setEnabled = function(b)
{
    enabled = b;
    //if (enabled) Audio.startMusic();
    //else Audio.stopMusic();
}

Audio.startMusic = function()
{
    /*var snd = sounds[RES.GAME_MUSIC];
    snd.loop = true;
    snd.volume = 0.5;
    // Start playing music (fade in). We call restart, which stops the
    // previously play (if any), rewinds and starts again.
    snd.restart();
    snd.fadeIn(1);*/
}

Audio.stopMusic = function()
{
    //sounds[RES.GAME_MUSIC].pause();
}
