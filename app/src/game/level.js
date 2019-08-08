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

import { RES } from './res';
import { Utils } from './utils';
import { Render } from './render';
import { GroundItem } from './grounditem';

/**********/
/* Camera */
/**********/

function Camera(w, h)
{
    this.x = 0;
    this.y = 0;
    this.width = w;
    this.height = h;
}

//Camera.autoFit

/*********/
/* Track */
/*********/

class Track
{
    constructor(level, number, y) {
        this.level = level;
        this.y = y;
        this.number = number;
    }

    checkSolidAt(x, width) {
        return this.level.checkSolidAt(x, this.y, width);
    }
};

/*********/
/* Level */
/*********/

// Helper function for sorting sprites by depth, so sprites in the backround
// are drawn below sprites in the foreground.
function compareDepth(s1, s2) {
    var z1 = s1.zpos || s1.y;
    var z2 = s2.zpos || s2.y;
    return (z1>z2) - (z2>z1);
}

export class Level
{
    constructor(compound)
    {
        // The various level states
        this.PLAYING = 0;
        this.FINISHED = 1;

        this.camera = new Camera(Level.CAMERA_WIDTH, Level.CAMERA_HEIGHT);
        this.player = null;
        this.state = this.PLAYING;
        // The background sprite (TiledBackground)
        this.compound = compound;
        this.compound.zpos = Level.BACKGROUND_POS;
        // List of enemies, interactable objects etc and the player
        this.things = [];
        // The PIXI container for everything we want to draw
        this.stage = new PIXI.Container();
        this.compound.addToLevel(this);

        this.darknessSprite = new PIXI.Sprite(
            Utils.renderDarkness(100, 60, 52, 32)
        );
        this.darknessSprite.zpos = Level.FRONT_POS;
        this.stage.addChild(this.darknessSprite);
        
        this.smoothTracking = true;
        this.exitDoor = null;

        let tileHeight = this.compound.getTileHeight();
        let y = this.compound.getHeight() - 1;
        this.tracks = [
            new Track(this, 0, y-tileHeight*2),
            new Track(this, 1, y-tileHeight),
            new Track(this, 2, y),
        ];
    }

    isFinished() {
        return this.state === this.FINISHED;
    }

    getTopTrack(n) {
        return this.tracks[0];
    }

    getMiddleTrack(n) {
        return this.tracks[1];
    }

    getBottomTrack(n) {
        return this.tracks[2];
    }

    getTrackAbove(track) {
        if (!track) return null;
        return this.getTrack(track.number-1);
    }

    getTrackBelow(track) {
        if (!track) return null;
        return this.getTrack(track.number+1);
    }

    getTrack(n)
    {
        if (n >= 0 && n < this.tracks.length) {
            return this.tracks[n];
        }
        return null;
    }

    destroy()
    {
        if (this.stage) {
            // Remove the player first, so they don't get destroyed
            // (reused in the next level)
            this.removeThing(this.player);
            this.stage.destroy({children: true});
            this.stage = null;
            this.things = null;
            this.player = null;
        }
    }

    // Returns the width of the level in pixels (ie render size)
    getWidth()
    {
        return this.compound.getWidth();
    }

    // Returns the height of the level in pixels (ie render size)
    getHeight()
    {
        return this.compound.getHeight();
    }

    /* Find some clear space to spawn a thing at the given location. This code
     * looks up/down until it finds the first pixel of free space. Returns the
     * y-position of that free space. */
    findClearSpace(x, y)
    {
        var offset = 0;
        while(true)
        {
            var north = this.compound.getTileAt(x, y + offset);
            var south = this.compound.getTileAt(x, y - offset);
            if (!north.solid) {
                return y + offset;
            }
            if (!south.solid) {
                return y - offset;
            }
            if (y + offset > this.compound.getHeight() && y - offset < 0) {
                // We've gone completely outside the level - no space found
                return null;
            }
            offset += RES.TILE_HEIGHT;
        }
    }

    // Called every frame to update the general level state
    update(dt)
    {
        // TODO - this could be better optimized by despawning things that are
        // no longer visible. (ie blood spatters etc)

        // Re-sort the sprites by Z-depth so things are rendered in the correct
        // order.
        this.stage.children.sort(compareDepth);
        // Update everything in the level
        for (let thing of this.things) {
            // TODO - only update things within camera view (+/- bounds)
            if (thing.update) thing.update(dt);
        }

        if (this.player.velx != 0)
        {
            // Update the camera to track the player. Have the camera move
            // smoothly towards the player to avoid jumping around.
            var xpos = this.player.basePos - this.camera.width/8;
            xpos = Math.max(xpos, 0);
            xpos = Math.min(xpos, this.compound.getWidth()-this.camera.width);
            if (this.smoothTracking) {
                var dirx = Math.sign(xpos-this.camera.x);
                this.camera.x += dt*1.25*this.player.maxSpeed*dirx;
                if (dirx != Math.sign(xpos-this.camera.x)) {
                    // Overshot the target, stop smoothly tracking
                    this.smoothTracking = false;
                }
            } else {
                this.camera.x = xpos;
            }
        }

        if (this.player.fx > this.getWidth()) {
            this.state = this.FINISHED;
        }

        // Position the camera
        this.stage.x = -this.camera.x;
        this.stage.y = -this.camera.y;
        this.darknessSprite.x = this.camera.x;
    }

    /* Check if the given hitbox, at the given position, overlaps with any thing 
     * in the level. Can also supply a thing to ignore when making the check. 
     * This function is used to determine if a projectile strikes a target. */
    checkHit(x, y, hitbox, ignore)
    {
        var xp = x + hitbox.x, yp = y + hitbox.y;
        var w = hitbox.w, h = hitbox.h;
        //var thing = null;
        //for (var n = 0; n < this.things.length; n++) 
        for (let thing of this.things)
        {
            //thing = this.things[n];
            if (thing !== ignore && thing.sprite && 
                thing.hitbox && thing.hitbox !== hitbox && 
                Math.abs(xp-thing.sprite.x-thing.hitbox.x) < (w+thing.hitbox.w)/2 &&
                Math.abs(yp-thing.sprite.y-thing.hitbox.y) < (h+thing.hitbox.h)/2)
            {
                return thing;
            }
        }
        return null;
    }

    /* Iterates over all things in this level, and calls the given function
     * for each thing that overlaps with the given hitbox. */
    forEachThingHit(x, y, hitbox, ignore, callback)
    {
        let xp = x + hitbox.x;
        let yp = y + hitbox.y;
        let w = hitbox.w;
        let h = hitbox.h;

        for (let thing of this.things)
        {
            if (thing !== ignore && thing.sprite && 
                thing.hitbox && thing.hitbox !== hitbox && 
                Math.abs(xp-thing.sprite.x-thing.hitbox.x) < (w+thing.hitbox.w)/2 &&
                Math.abs(yp-thing.sprite.y-thing.hitbox.y) < (h+thing.hitbox.h)/2)
            {
                callback(thing);
            }
        }
    }

    checkSolidAt(x, y, width)
    {
        var left = this.compound.getTileAt(x-width/2, y);
        var right = this.compound.getTileAt(x+width/2, y);
        return left.solid || right.solid;
    }

    // Add a 'thing' to the level and it's sprite to the render stage
    addThing(thing)
    {
        thing.level = this;
        this.things.push(thing);
        if (thing.sprite) {
            this.stage.addChild(thing.sprite);
        }
    }

    // Remove a 'thing' remove the level and it's sprite from the stage
    removeThing(thing)
    {
        var i = this.things.indexOf(thing);
        if (i >= 0) {
            this.things[i] = this.things[this.things.length-1];
            this.things.pop();
            thing.level = null;
        }

        if (thing.sprite && thing.sprite.parent) {
            thing.sprite.parent.removeChild(thing.sprite);
        }
    }

    handleTreasureDrop(table, x, y)
    {
        // Pick an item entry from the table, using a weighted probability pick
        // Entries look like: [item_number, weight]. First sum all the weights
        // and pick a random number up to that total.
        var total = 0;
        for (let entry of table) {
            total += entry[1];
        }
        // Pick a random number, then iterate over the items and find what 
        // item it corresponds to.
        var pick = null;
        var num = Utils.randint(0, total);
        for (let entry of table) {
            num -= entry[1];
            if (num <= 0) {
                pick = entry[0];
                break;
            }
        }
        // Drop the item
        if (pick !== null) {
            var gnd = new GroundItem(pick, x, y);
            gnd.velx = 10*(x > this.camera.x ? -1 : 1);
            gnd.velh = -40;
            this.addThing(gnd);
        }
    }

    createBloodSpatter(x, y, imgs)
    {
        var txt = Utils.randomChoice(imgs || ["blood1", "blood2", "blood3"]);
        var sprite = new PIXI.Sprite(Utils.getFrame(RES.MAP_OBJS, txt));
        sprite.zpos = Level.FLOOR_POS;
        sprite.anchor.set(0.5, 0.5);
        sprite.x = x;
        sprite.y = y;
        this.stage.addChild(sprite);
        return sprite;
    }

    getTileAt(x, y) {
        return this.compound.getTileAt(x, y);
    }

    isThingVisible(thing) {
        return (
            thing.x < this.camera.x + this.camera.width &&
                thing.x + thing.width > this.camera.x
        );
    }
}

Level.BEHIND_BACKGROUND_POS = -1;
Level.BACKGROUND_POS = 0;
Level.FLOOR_POS = 1;
Level.FRONT_POS = 10000;
Level.ROW_DEPTH = 5;

Level.CAMERA_WIDTH = 100;
Level.CAMERA_HEIGHT = 60;
