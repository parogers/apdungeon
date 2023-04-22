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
import { Render } from './render';

export var Utils = {};

// Returns a random number integer between a & b (inclusive)
Utils.randint = function(a, b)
{
    return (a + (b-a+1)*Math.random())|0;
}

// Returns a random number selected uniformly over the interval [a, b)
Utils.randUniform = function(a, b)
{
    return (a + (b-a+1)*Math.random());
}

// Returns a random element selected uniformly from the given list
Utils.randomChoice = function(lst)
{
    let n = (Math.random() * lst.length)|0;
    return lst[n];
}

// Returns a matrix (ie n[row][col]) of the given value. Also the number of
// rows and columns (rows, cols) are available as attributes.
Utils.createGrid = function(rows, cols, value)
{
    let grid = [];
    grid.rows = rows;
    grid.cols = cols;
    for (let row = 0; row < rows; row++) {
        grid[row] = [];
        for (let col = 0; col < cols; col++) {
            grid[row][col] = value;
        }
    }
    return grid;
}

// Returns a sprite used for monsters/player treading water
Utils.createSplashSprite = function()
{
    let waterSprite = new PIXI.Sprite();
    waterSprite.anchor.set(0.5, 0.5);
    waterSprite.visible = false;
    waterSprite.texture = Utils.getFrame(RES.MAP_OBJS, 'treading_water');
    return waterSprite;
}

// Helper function for returning a texture set given the resource string
Utils.getTextures = function(res)
{
    if (!res) throw Error('must specify a resource');
    // return PIXI.loader.resources[res].textures;
    return window.assetsBundle[res].textures;
}

Utils.getChunk = function(name)
{
    // return PIXI.loader.resources[RES.CHUNKS].chunks[name];
    return window.assetsBundle.chunks[name];
}

Utils.getTileset = function()
{
    return window.assetsBundle.tileset;
    // return PIXI.loader.resources[RES.TILESET].tileset;
}

Utils.getFrame = function(res, name)
{
    const textures = Utils.getTextures(res);
    if (!textures) {
        console.error('cannot find textures:', res);
    }
    const texture = textures[name];
    if (!texture) {
        console.error(`cannot find texture: ${name} (in ${res})`);
    }
    return texture;
}

Utils.getFrames = function(res, names)
{
    let frames = [];
    for (let n = 0; n < names.length; n++) {
        let frame = Utils.getTextures(res)[names[n]];
        if (!frame) console.log('ERROR: missing frame ' + names[n]);
        frames.push(frame);
    }
    return frames;
}

// Updates a dictionary with the contents of another dictionary
Utils.updateDict = function(dict, other)
{
    for (let key in other) {
        dict[key] = other[key];
    }
}

/************/
/* Sequence */
/************/

export function Sequence()
{
    let args = arguments[0];
    for (let key in args) {
        this[key] = args[key];
    }
    this.done = false;
    this.numSteps = arguments.length-1;
    this.labels = {};
    for (let n = 1; n < arguments.length; n++) {
        // The sequence contains functions to call, and embedded strings to
        // use as labels. (for looping, branching, etc)
        if (arguments[n].constructor === String) {
            this.labels[arguments[n]] = n-1;
        } else {
            // Note functions are assigned to this object, so that calling
            // them this way gives us access to 'this' inside.
            let name = 'func_' + (n-1);
            this[name] = arguments[n];
        }
    }
    // The current state. This advances incrementally by default, and
    // occasionally jumping randomly to another state.
    this.state = 0;
    // Delay before advancing the state
    this.delay = 0;
    this.NEXT = true;
}

Sequence.prototype.update = function(dt)
{
    if (this.done) return;
    if (this.delay > 0) {
        this.delay -= dt;
        return;
    }
    // Check if the current state is a function (or a label)
    let fname = 'func_' + this.state;
    if (this[fname]) {
        let ret = this[fname](dt);
        if (ret === this.NEXT) {
            // Advance to the next state
            this.state++;
        } else if (ret) {
            // Jump to another state
            this.state = this.labels[ret];
        }
    } else {
        // Skip over the label
        this.state++;
    }
    if (this.state >= this.numSteps) {
        this.done = true;
    }
}
