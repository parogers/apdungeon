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

function getMaxFit(element, aspectRatio) {
    const rect = element.getBoundingClientRect();
    let width = Math.round(rect.height*aspectRatio);
    let height = rect.height;
    if (width > rect.width) {
        width = rect.width;
        height = Math.round(rect.width/aspectRatio);
    }
    return {
        width,
        height,
    };
}

export class Render {
    // The PIXI renderer
    static renderer = null;
    // The containing element
    static container = null;
    // The preferred aspect ratio for sizing the render view
    static aspectRatio = 1;
    static viewWidth = 0;
    static viewHeight = 0;

    /* Configures the renderer (via PIXI) and adds the view to the given HTML
     * element. The renderer width/height will conform to the given aspect
     * ratio. */
    static async configure(div, viewWidth, viewHeight)
    {
        const aspect = viewWidth/viewHeight;
        const { width, height } = getMaxFit(div, aspect);

        PIXI.TextureStyle.defaultOptions.scaleMode = 'nearest';
        Render.renderer = await PIXI.autoDetectRenderer({
            width: width || 1,
            height: height || 1,
            //antialias: true,
            // Required to prevent flickering in Chrome on Android (others too?)
            preserveDrawingBuffer: true,
            //clearBeforeRender: true
        });
        Render.viewWidth = viewWidth;
        Render.viewHeight = viewHeight;

        div.innerHTML = '';
        div.appendChild(Render.renderer.canvas);
        Render.container = div;
        Render.aspectRatio = aspect;
    }

    static getContainer() {
        return Render.container;
    }

    static getRenderer() {
        return Render.renderer;
    }

    /* Resize the renderer to fit the parent container */
    static resize() {
        const { width, height } = getMaxFit(
            Render.container,
            Render.aspectRatio
        );
        Render.renderer.resize(width, height);
    }

    static mouseToViewPos(x, y) {
        return {
            x: Render.viewWidth * x / Render.renderer.width,
            y: Render.viewHeight * y / Render.renderer.height
        };
    }
}
