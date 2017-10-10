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

var Utils = require("./utils");
var RES = require("./res");
var Render = require("./render");
var GameControls = require("./controls");

/****************/
/* TouchAdapter */
/****************/

class TouchAdapter
{
    constructor(touchUI, controls)
    {
        this.touchUI = touchUI;
        this.controls = controls;
        this.attackTouch = null;
        this.movementTouch = null;
        this.tapTouch = null;

        // Create bound forms of the touch handlers, so we can add and 
        // remove them as needed.
        this.onTouchStart = this.handleTouchStart.bind(this);
        this.onTouchMove = this.handleTouchMove.bind(this);
        this.onTouchEnd = this.handleTouchEnd.bind(this);

        this.viewElement = Render.getRenderer().view;
        this.viewElement.addEventListener("touchstart", this.onTouchStart);
        this.viewElement.addEventListener("touchmove", this.onTouchMove);
        this.viewElement.addEventListener("touchend", this.onTouchEnd);
        this.viewElement.addEventListener("touchcancel", this.onTouchEnd);
    }

    destroy() {
        if (this.viewElement === null) 
            return;
        console.log("REMOVING EVENT HANDLERS");
        this.viewElement.removeEventListener("touchstart", this.onTouchStart);
        this.viewElement.removeEventListener("touchmove", this.onTouchMove);
        this.viewElement.removeEventListener("touchend", this.onTouchEnd);
        this.viewElement.removeEventListener("touchcancel", this.onTouchEnd);
        this.viewElement = null;
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

        let viewRect = this.viewElement.getBoundingClientRect();
        let padArea = this.touchUI.padSprite.getBounds();
        let btnArea = this.touchUI.buttonSprite.getBounds();

        for (let touch of event.changedTouches) 
        {
            let x = touch.clientX - viewRect.left;
            let y = touch.clientY - viewRect.top;

            // A single touch anywhere counts as a space bar
            /*if (this.tapTouch === null) 
            {
                this.tapTouch = new Touch(
                    touch.identifier, touch.pageX, touch.pageY);
                this.controls.space.press();
            }*/
            if (this.attackTouch === null && btnArea.contains(x, y))
            {
                this.attackTouch = new Touch(touch.identifier, x, y);
                this.controls.primary.press();
            } 
            else if (this.movementTouch === null && padArea.contains(x, y))
            {
                this.movementTouch = new Touch(touch.identifier, x, y);
                //this.handleTouchMove(event);
            }
        }
        event.preventDefault();
        event.stopPropagation();
    }

    handleTouchMove(event)
    {
        let viewRect = this.viewElement.getBoundingClientRect();
        let padArea = this.touchUI.padSprite.getBounds();

        let orad = padArea.width/4;
        let irad = orad*0.1;

        for (let touch of event.changedTouches)
        {
            if (this.movementTouch !== null &&
                this.movementTouch.id === touch.identifier)
            {
                let x = touch.clientX - viewRect.left;
                let y = touch.clientY - viewRect.top;

                let dx = x - (padArea.x + padArea.width/2);
                let dy = y - (padArea.y + padArea.height/2);

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
            /*if (this.tapTouch !== null && 
                this.tapTouch.id === touch.identifier) {
                this.tapTouch = null;
                this.controls.space.release();
            }*/
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

/***********/
/* TouchUI */
/***********/

class TouchUI
{
    constructor()
    {
        this.container = new PIXI.Container();
        this.padSprite = new PIXI.Sprite(
            Utils.getFrame(RES.UI, "controller-pad"));
        this.padSprite.anchor.set(0.5, 0.5);
        this.buttonSprite = new PIXI.Sprite(
            Utils.getFrame(RES.UI, "controller-button"));
        this.buttonSprite.anchor.set(0.5, 0.5);

        this.container.alpha = 0.25;
        this.container.addChild(this.padSprite);
        this.container.addChild(this.buttonSprite);

        this.touchAdapter = new TouchAdapter(this, GameControls.getControls());
    }

    destroy()
    {
        if (this.container !== null) {
            this.container.destroy();
            this.container = null;
            this.touchAdapter.destroy();
            this.touchAdapter = null;
        }
    }

    /* Layout the on-screen controller sprites to cover the given area */
    doLayout(width, height)
    {
        this.padSprite.x = this.padSprite.width*0.6;
        this.padSprite.y = height/2+1;
        this.buttonSprite.x = width-this.buttonSprite.width*0.65;
        this.buttonSprite.y = height/2+1;
    }
}

module.exports = TouchUI;
