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
        this._track = null;
        this.level = null;
        this.frame = 0;
    }

    get track() {
        return this._track;
    }

    // Moves this thing onto the given track maintaining the same x-pos
    // and height off the floor.
    set track(track)
    {
        this._track = track;
        if (track) this.fy = track.y;
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

    set x(value) {
        this.sprite.x = value;
    }

    set y(value) {
        this._h = 0;
        this._y = value;
        this.sprite.y = value;
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

    // The z-depth of the sprite for sorting/rendering purposes
    get zpos() {
        return this.sprite.zpos;
    }

    set fx(value) {
        this.sprite.x = value;
    }

    // Set the y-pos of this thing (on the floor)
    set fy(value)
    {
        this._y = value;
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

    set zpos(value) {
        this.sprite.zpos = value;
    }

    set facing(dir)
    {
        this.sprite.scale.x = Math.abs(this.sprite.scale.x)*Math.sign(dir);
    }

    get facing() {
        return Math.sign(this.sprite.scale.x);
    }

    update(dt)
    {
    }

    handleHit(x, y, dmg)
    {
    }

    handlePlayerCollision(player)
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
        return this.level.getTileAt(this.fx, this.fy)
    }
}

/**********/
/* Hitbox */
/**********/

// A hitbox that defines an area of a thing to test collisions against. Note
// the (x, y) point is relative to the thing's sprite position, and (w, h)
// defines a rectangle that is centered on that position.
export function Hitbox(x, y, w, h)
{
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
}

/**************/
/* TrackMover */
/**************/

/* Moves a thing between tracks */
export class TrackMover
{
    constructor(thing, targetTrack, speed, accelh) {
        this.accelh = -Math.abs(accelh);
        this.thing = thing;
        this.targetTrack = targetTrack;
        this.speed = speed;
        this.done = false;
        this.duration = Math.abs(this.thing.y - this.targetTrack.y)/speed;
        this.vely = Math.sign(this.targetTrack.y - this.thing.y)*speed;
        this.velh = -this.accelh*this.duration/2;
    }

    // Move the thing closer to the target track. This function returns true
    // if the movement is finished and false otherwise.
    update(dt)
    {
        if (this.done) {
            return true;
        }

        if (this.targetTrack === this.thing.track)
        {
            this.done = true;
            return true;
        }

        this.velh += this.accelh*dt;
        this.thing.fy += this.vely*dt;
        this.thing.fh += this.velh*dt;

        // Clamp the thing to the floor just in case rounding errors
        // make the initial vertical speed estimate wrong.
        if (this.thing.fh < 0) this.thing.fh = 0;

        this.duration -= dt;
        if (this.duration <= 0)
        {
            this.thing.fy = this.targetTrack.y;
            this.thing.fh = 0;
            this.thing.track = this.targetTrack;
            this.done = true;
        }
        return false;
    }
}


/*************/
/* Animation */
/*************/

export class Animation
{
    constructor(animResource)
    {
        this.frames = Resources.shared.getFrames(animResource.frames);
        this.fps = animResource.fps;
        this.looping = (
            animResource.looping !== undefined ? animResource.looping : true
        );
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
