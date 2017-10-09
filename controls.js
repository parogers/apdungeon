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

var PRIMARY = 90;
var PRIMARY_ALT = 65;
var SWAP = 88;
var SPACE = 32;
var ARROW_UP = 38;
var ARROW_LEFT = 37;
var ARROW_RIGHT = 39;
var ARROW_DOWN = 40;
var TEST_KEY = 75;

var DEFAULTS = [
    ["up", ARROW_UP],
    ["down", ARROW_DOWN],
    ["left", ARROW_LEFT],
    ["right", ARROW_RIGHT],
    ["primary", [PRIMARY, PRIMARY_ALT]],
    ["swap", SWAP],
    ["space", SPACE]
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
    }

    press(set) {
        this.pressed = !this.held;
        this.held = (set === undefined ? true : set);
    }

    release(set) {
        this.released = !!this.held;
        this.held = (set === undefined ? false : set);
    }
}

function GameControls()
{
    // Map of Input instances stored by key code
    this.inputByKey = {};
    this.inputs = [];
    for (let arg of DEFAULTS) 
    {
        let name = arg[0];
        let keys = arg[1];

        if (typeof(keys.push) !== "function") {
            keys = [keys];
        }

        this[name] = new Input(name);
        this.inputs.push(this[name]);
        for (let key of keys) {
            this.inputByKey[key] = this[name];
        }
    }
}

GameControls.prototype.getX = function()
{
    return (this.right.held - this.left.held);
}

GameControls.prototype.getY = function()
{
    return (this.down.held - this.up.held);
}

/* This should be called after the game state is updated */
GameControls.prototype.update = function()
{
    for (let input of this.inputs) {
        input.pressed = false;
        input.released = false;
    }
}

GameControls.prototype.attachKeyboardEvents = function()
{
    window.addEventListener("keydown", (event) => {
        var input = this.inputByKey[event.keyCode];
        if (input) {
            input.press();
            event.stopPropagation();
            event.preventDefault();
        }
    });

    window.addEventListener("keyup", (event) => {
        var input = this.inputByKey[event.keyCode];
        if (input) {
            input.release();
            event.stopPropagation();
            event.preventDefault();
        }
    });
}

GameControls.prototype.attachTouchEvents = function()
{
    this.touchAdapter = new TouchAdapter(window, this);
}

GameControls.prototype.attach = function()
{
    this.attachKeyboardEvents();
    this.attachTouchEvents();
}

/* */

class TouchAdapter
{
    constructor(el, controls)
    {
        this.controls = controls;
        this.attackTouch = null;
        this.movementTouch = null;
        this.tapTouch = null;
        this.element = el;

        el.addEventListener(
            "touchstart", 
            this.handleTouchStart.bind(this), 
            true);
        el.addEventListener(
            "touchmove", 
            this.handleTouchMove.bind(this), 
            true);
        el.addEventListener(
            "touchend", 
            this.handleTouchEnd.bind(this), 
            true);
        el.addEventListener(
            "touchcancel", 
            this.handleTouchEnd.bind(this), 
            true);
    }

    handleTouchStart(event)
    {
        class Touch {
            constructor(id, x, y) {
                this.id = id;
                this.startx = x;
                this.starty = y;
            }
        };

        let middle = this.element.innerWidth/2;
        for (let touch of event.changedTouches) 
        {
            if (this.tapTouch === null) 
            {
                this.tapTouch = new Touch(
                    touch.identifier, touch.pageX, touch.pageY);
                this.controls.space.press();
            }

            if (touch.pageX > middle && this.attackTouch === null) 
            {
                this.attackTouch = new Touch(
                    touch.identifier, touch.pageX, touch.pageY);
                this.controls.primary.press();
            } 
            else if (touch.pageX < middle && this.movementTouch === null)
            {
                this.movementTouch = new Touch(
                    touch.identifier, touch.pageX, touch.pageY);
                this.handleTouchMove(event);
            }
        }
        event.preventDefault();
        event.stopPropagation();
    }

    handleTouchMove(event)
    {
        // Center of the on-screen controller
        let centreX = this.element.innerWidth/6;
        let centreY = this.element.innerHeight/2;
        let orad = (this.element.innerHeight/2)/3;
        let irad = orad*0.1;
        for (let touch of event.changedTouches)
        {
            if (this.movementTouch !== null &&
                this.movementTouch.id === touch.identifier)
            {
                let dx = touch.pageX - centreX;
                let dy = touch.pageY - centreY;
                let magx = Math.min((Math.abs(dx)-irad)/orad, 1);
                let magy = Math.min((Math.abs(dy)-irad)/orad, 1);

                if (dx >= irad) {
                    this.controls.left.release();
                    this.controls.right.press(magx)
                } else if (dx <= -irad) {
                    this.controls.left.press(magx);
                    this.controls.right.release();
                } else {
                    this.controls.left.release();
                    this.controls.right.release();
                }

                if (dy >= irad) {
                    this.controls.up.release();
                    this.controls.down.press(magy)
                } else if (dy <= -irad) {
                    this.controls.up.press(magy);
                    this.controls.down.release();
                } else {
                    this.controls.up.release();
                    this.controls.down.release();
                }
            }
        }
        event.preventDefault();
        event.stopPropagation();
    }

    handleTouchEnd(event)
    {
        for (let touch of event.changedTouches) 
        {
            if (this.tapTouch !== null && 
                this.tapTouch.id === touch.identifier) {
                this.tapTouch = null;
                this.controls.space.release();
            }
            if (this.attackTouch !== null && 
                this.attackTouch.id === touch.identifier) 
            {
                this.attackTouch = null;
                this.controls.primary.release();
            }
            if (this.movementTouch !== null &&
                this.movementTouch.id === touch.identifier)
            {
                this.controls.up.release();
                this.controls.down.release();
                this.controls.left.release();
                this.controls.right.release();
                this.movementTouch = null;
            }
        }
        event.preventDefault();
        event.stopPropagation();
    }
}

/******************/
/* ManualControls */
/******************/

class ManualControls
{
    constructor() {
        this.dirx = 0;
        this.diry = 0;

        for (let arg of DEFAULTS) 
        {
            let name = arg[0];
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

module.exports = {};
module.exports.configure = function()
{
    controls = new GameControls();
    controls.attach();
}

module.exports.update = function()
{
    controls.update();
}

module.exports.getControls = function()
{
    return controls;
}

module.exports.ManualControls = ManualControls;

