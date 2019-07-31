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

class Gesture
{
    public tap: boolean = false;
    public line: boolean = false;
    public diagonal: boolean = false;
    public leftToRight: boolean = false;
    public rightToLeft: boolean = false;
    public topToBottom: boolean = false;
    public bottomToTop: boolean = false;
    public speed: number = 0; // pixels per second

    public startx: number = 0;
    public starty: number = 0;

    public endx: number = 0;
    public endy: number = 0;

    get dx() {
        return this.endx - this.startx;
    }

    get dy() {
        return this.endy - this.starty;
    }

    get isVerticalLine() {
        return this.line && (this.topToBottom || this.bottomToTop);
    }

    get isHorizontalLine() {
        return this.line && (this.leftToRight || this.rightToLeft);
    }
}

class Touch
{
    public startTime: number;
    public id: number;
    public startx: number;
    public starty: number;
    public lastx: number;
    public lasty: number;
    public totalDistance: number = 0;

    constructor(id, x, y)
    {
        this.startTime = (new Date()).getTime()/1000.0;
        this.id = id;
        this.startx = x;
        this.starty = y;
        this.totalDistance = 0;
        this.lastx = x;
        this.lasty = y;
    }

    addPoint(x, y)
    {
        let dist = Math.sqrt(
            (x - this.lastx) ** 2 +
            (y - this.lasty) ** 2
        );
        this.totalDistance += dist;
        this.lastx = x;
        this.lasty = y;
    }

    get dx() {
        return this.lastx - this.startx;
    }

    get dy() {
        return this.lasty - this.starty;
    }

    makeGesture()
    {
        let gesture = new Gesture();
        let slope = 3.01;
        let stopTime = (new Date()).getTime()/1000.0;

        gesture.speed = this.totalDistance / (stopTime - this.startTime);
        gesture.startx = this.startx;
        gesture.starty = this.starty;
        gesture.endx = this.lastx;
        gesture.endy = this.lasty;

        if (this.totalDistance < 25)
        {
            // Single tap
            gesture.tap = true;
        }
        else if (Math.abs(this.dy) < Math.abs(this.dx)/slope)
        {
            // Horizontal line
            gesture.line = true;
            if (this.startx < this.lastx) {
                gesture.leftToRight = true;
            } else {
                gesture.rightToLeft = true;
            }
        }
        else if (Math.abs(this.dy) > slope*Math.abs(this.dx))
        {
            // Vertical line
            gesture.line = true;
            if (this.starty < this.lasty) {
                gesture.topToBottom = true;
            } else {
                gesture.bottomToTop = true;
            }
        }
        else
        {
            // Diagonal line
            gesture.line = true;
            gesture.diagonal = true;
            if (this.dx > 0) {
                gesture.leftToRight = true;
            } else {
                gesture.rightToLeft = true;
            }
            if (this.dy > 0) {
                gesture.topToBottom = true;
            } else {
                gesture.bottomToTop = true;
            }
        }
        return gesture;
    }
}

/*
 * Recognizes touch gestures:
 *
 * -Single tap (with duration)
 * -Horizontal or vertical line (direction and duration)
 *
 */
export class GestureManager
{
    private onTouchStart: any;
    private onTouchMove: any;
    private onTouchEnd: any;

    private element: any;
    private touches: any;
    public gestureCallback: any;

    constructor() {
        this.touches = {};
        this.gestureCallback = null;
    }

    attach(element)
    {
        this.element = element;

        this.onTouchStart = (event) => {
            let rect = this.element.getBoundingClientRect();
            for (let touchEvent of event.changedTouches)
            {
                let x = touchEvent.clientX - rect.x;
                let y = touchEvent.clientY - rect.y;

                this.touches[touchEvent.identifier] = new Touch(
                    touchEvent.identifier,
                    x,
                    y
                );
            }
            event.preventDefault();
        };

        this.onTouchMove = (event) => {
            let rect = this.element.getBoundingClientRect();
            for (let touchEvent of event.changedTouches)
            {
                let touch = this.touches[touchEvent.identifier];
                if (touch) {
                    let x = touchEvent.clientX - rect.x;
                    let y = touchEvent.clientY - rect.y;
                    touch.addPoint(x, y);
                }
            }
            event.preventDefault();
        };

        this.onTouchEnd = (event) => {
            for (let touchEvent of event.changedTouches)
            {
                let touch = this.touches[touchEvent.identifier];
                if (touch) {
                    if (this.gestureCallback) {
                        let gesture = touch.makeGesture();
                        this.gestureCallback(gesture);
                    }
                }
                delete this.touches[touchEvent.identifier];
            }
            event.preventDefault();
        };

        this.element.addEventListener('touchstart', this.onTouchStart);
        this.element.addEventListener('touchmove', this.onTouchMove);
        this.element.addEventListener('touchend', this.onTouchEnd);
        this.element.addEventListener('touchcancel', this.onTouchEnd);
    }

    detach()
    {
        if (!this.element) {
            return;
        }
        this.element.removeEventListener('touchstart', this.onTouchStart);
        this.element.removeEventListener('touchmove', this.onTouchMove);
        this.element.removeEventListener('touchend', this.onTouchEnd);
        this.element.removeEventListener('touchcancel', this.onTouchEnd);
        this.element = null;
    }
}
