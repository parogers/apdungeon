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
