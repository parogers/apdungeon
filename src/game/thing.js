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
import { Utils } from './utils';
import { Audio } from './audio';

import { Resources } from './res';

/* Template code for defining a 'thing' in a level. Generally things have
 * sprites associated with them, and can be interacted with by the player.
 * Note there's no need to subclass because this code doesn't contain any
 * useful base functionality. Just copy+paste and change what's needed. */
export class Thing
{
    constructor(resources)
    {
        this.resources = resources;
        // The top-level container that holds all pieces of the sprite
        this.sprite = new PIXI.Container();
        // Position of the hit box relative to the sprite position
        this.hitbox = new Hitbox(0, 0, 4, 4);
        this.level = null;
        this._y = 0;
        this._h = 0;
        this._zpos = null;
        this.level = null;
        this.frame = 0;
    }

    get width() {
        return Math.abs(this.sprite.width);
    }

    get height() {
        return Math.abs(this.sprite.height);
    }

    get x() {
        return this.sprite.x;
    }

    get y() {
        return this.sprite.y;
    }

    get position() {
        return this.sprite.position;
    }

    set x(value) {
        this.sprite.x = value;
    }

    set y(value) {
        this._h = 0;
        this._y = value;
        this.sprite.y = value;
        this.sprite.zIndex = this._zpos ?? value;
        if (isNaN(this.sprite.zIndex)) {
            throw Error(`sprite has NaN zIndex, value=${value}`);
        }
    }

    get zpos() {
        return this.sprite.zIndex;
    }

    set zpos(value) {
        this._zpos = value;
        this.sprite.zIndex = value ?? this.fy;
        if (isNaN(this.sprite.zIndex)) {
            throw Error(`sprite has NaN zIndex, value=${value}`);
        }
    }

    // The horizontal position of the thing (equal to the sprite position)
    get fx() {
        return this.sprite.x;
    }

    // The vertical/depth position of the thing. Note this is different
    // than the sprite y-pos if the sprite isn't sitting on the floor.
    get fy() {
        return this._y;
    }

    // How far the thing is off the ground (positive values go up the screen
    // and negative values go down)
    get fh() {
        return this._h;
    }

    set fx(value) {
        this.sprite.x = value;
    }

    // Set the y-pos of this thing (on the floor)
    set fy(value)
    {
        this._y = value;
        this.sprite.zIndex = this._zpos ?? value;
        // This is confusing - the sprite y-pos increases going down
        // the screen while the height off the floor decreases
        this.sprite.y = this._y - this._h;
    }

    // Set the height off the floor for this sprite
    set fh(value)
    {
        this._h = value;
        this.sprite.y = this._y - this._h;
    }

    set facing(dir)
    {
        this.sprite.scale.x = Math.abs(this.sprite.scale.x)*Math.sign(dir);
    }

    get facing() {
        return Math.sign(this.sprite.scale.x);
    }

    faceThing(thing) {
        this.facing = Math.sign(thing.x - this.x) ?? 1;
    }

    update(dt)
    {
    }

    get isOnCamera() {
        return this.level && this.level.isThingVisible(this);
    }

    removeSelf()
    {
        if (this.level) {
            this.level.removeThing(this);
        }
    }

    getTileUnder() {
        return this.level?.getTileAt(this.fx, this.fy)
    }
}

/************/
/* Creature */
/************/

export class Creature extends Thing {
    constructor() {
        super();
        this.health = 0;
        this.facing = 1;
    }

    get dead() {
        return this.health <= 0;
    }
}


/**********/
/* Hitbox */
/**********/

export const Hitbox = PIXI.Rectangle;


/*************/
/* Animation */
/*************/

export class Animation
{
    constructor(animResource)
    {
        if (typeof animResource === 'object') {
            this.frames = Resources.shared.getFrames(animResource.frames);
            this.fps = animResource.fps;
            this.looping = (
                animResource.looping !== undefined ? animResource.looping : true
            );
        } else {
            this.frames = animResource;
            this.fps = 5;
            this.looping = true;
        }
        this.playing = true;
        this.frame = 0;
        this.startedFrame = true;
    }

    start(frameNum)
    {
        if (frameNum !== undefined) {
            this.frame = frameNum;
        }
        this.playing = true;
    }

    stop() {
        this.playing = false;
    }

    get frameNum()
    {
        if (this.looping) {
            return (this.frame|0) % this.frames.length;
        }
        return Math.min(this.frame|0, this.frames.length-1);
    }

    get texture() {
        return this.frames[this.frameNum];
    }

    get done() {
        if (this.looping) return false;
        return this.frameNum === this.frames.length-1;
    }

    update(dt)
    {
        if (this.playing) {
            this.frame += this.fps*dt;
        }
        return this.texture;
    }
}
