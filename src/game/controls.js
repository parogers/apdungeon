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

const PRIMARY = 'Enter';
const PRIMARY_ALT = 'z';
const SWAP = 'x';
const SPACE = ' ';
const ARROW_UP = ['w', 'ArrowUp'];
const ARROW_LEFT = ['a', 'ArrowLeft'];
const ARROW_RIGHT = ['d', 'ArrowRight'];
const ARROW_DOWN = ['s', 'ArrowDown'];

const DOUBLE_PRESS_TIME = 0.3;

const DEFAULTS = [
    ['up', ARROW_UP],
    ['down', ARROW_DOWN],
    ['left', ARROW_LEFT],
    ['right', ARROW_RIGHT],
    ['primary', [PRIMARY, PRIMARY_ALT]],
    ['swap', SWAP],
    ['space', SPACE]
];

var controls = null;

/* A single input (eg attack) */
class Input
{
    constructor(name) {
        this.name = name;
        this.held = false;
        this.pressed = false;
        this.released = false;
        this.doublePressed = false;
    }

    press(set) {
        this.pressed = !this.held;
        this.held = (set === undefined ? true : set);
    }

    release(set) {
        this.released = !!this.held;
        this.held = false;
    }
}

class PlayerGameControls
{
    constructor() {
        // Map of Input instances stored by key code
        this.inputByKey = {};
        this.inputs = [];
        this.time = 0;
        // Keep track of the last input pressed, so we can detect double-pressing
        this.lastInputPressed = null;
        this.lastInputPressedTime = 0;
        // Whether the player is driving these controls with a touchscreen
        this.hasTouch = false;
        for (let arg of DEFAULTS)
        {
            const name = arg[0];
            let keys = arg[1];

            if (!Array.isArray(keys)) {
                keys = [keys];
            }

            this[name] = new Input(name);
            this.inputs.push(this[name]);
            for (let key of keys) {
                this.inputByKey[key] = this[name];
            }
        }
    }

    getX() {
        return (this.right.held - this.left.held);
    }

    getY() {
        return (this.down.held - this.up.held);
    }

    /* This should be called after the game state is updated */
    update(dt)
    {
        this.time += dt;
        for (let input of this.inputs) {
            input.pressed = false;
            input.released = false;
            input.doublePressed = false;
        }
    }

    attachKeyboardEvents()
    {
        this.onKeydown = (event) => {
            if (event.repeat) {
                return;
            }
            const input = this.inputByKey[event.key];
            if (input && !input.held)
            {
                // Handle double-pressing the input
                if (this.lastInputPressed === input &&
                    this.time - this.lastInputPressedTime < DOUBLE_PRESS_TIME)
                {
                    input.doublePressed = true;
                }
                this.lastInputPressedTime = this.time;
                this.lastInputPressed = input;

                input.press();
                event.stopPropagation();
                event.preventDefault();
            }
        };
        this.onKeyup = (event) => {
            const input = this.inputByKey[event.key];
            if (input) {
                input.release();
                event.stopPropagation();
                event.preventDefault();
            }
        };
        window.addEventListener('keydown', this.onKeydown);
        window.addEventListener('keyup', this.onKeyup);
    }

    attach()
    {
        this.attachKeyboardEvents();
    }

    destroy() {
        window.removeEventListener('keydown', this.onKeydown);
        window.removeEventListener('keyup', this.onKeyup);
    }
}

/******************/
/* ManualControls */
/******************/

export class ManualControls
{
    constructor() {
        this.dirx = 0;
        this.diry = 0;

        for (let arg of DEFAULTS)
        {
            const name = arg[0];
            this[name] = new Input(name);
        }
    }

    getX() {
        return this.dirx;
    }

    getY() {
        return this.diry;
    }
}

/***********/
/* Exports */
/***********/

export var GameControls = {
    configure: function(view)
    {
        controls = new PlayerGameControls(view);
        controls.attach();
    },

    update: function(dt) {
        controls.update(dt);
    },

    getControls: function()
    {
        return controls;
    },
    destroy: function() {
        controls.destroy();
        controls = null;
    }
}
