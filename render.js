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

var renderer = null;

module.exports = {};
module.exports.configure = function(width, height, div) 
{
    PIXI.settings.SCALE_MODE = PIXI.SCALE_MODES.NEAREST;
    // Disable the ticker sinc we don't use it (rendering happens as needed)
    PIXI.ticker.shared.autoStart = false;
    PIXI.ticker.shared.stop();

    renderer = PIXI.autoDetectRenderer({
        width: width,
        height: height,
        //    antialias: true,
        // Required to prevent flickering in Chrome on Android (others too?)
        preserveDrawingBuffer: true,
        //    clearBeforeRender: true
    });

    if (div) {
        div.appendChild(renderer.view);
    }
}

module.exports.getRenderer = function() {
    return renderer;
}

