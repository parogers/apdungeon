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

import { Utils } from './utils';
import { Resources, RES } from './res';
import { Audio } from './audio';

// Adds a basic shadow to a thing. The shadow sprite always sticks to
// the floor and changes size slightly based on how far the thing
// moves vertically.
export class Shadow
{
    constructor(thing, size)
    {
        this.thing = thing;
        this.shadowSprite = new PIXI.Sprite(
            Resources.shared.getFrame(size)
        );
        this.shadowSprite.anchor.set(0.5, 0.5);
        this.thing.sprite.addChildAt(this.shadowSprite, 0);
    }

    get visible() {
        return this.shadowSprite.visible;
    }

    set visible(value) {
        this.shadowSprite.visible = value;
    }

    update(dt)
    {
        // Make sure the shadow stays on the floor when we jump
        this.shadowSprite.y = this.thing.fh;
        // Have the shadow increase size slightly when the player is
        // further away from the floor.
        this.shadowSprite.scale.set(
            1 + this.thing.fh / 50.0,
            1 + this.thing.fh / 30.0
        );
    }

    remove() {
        this.thing.sprite.removeChild(this.shadowSprite);
    }
}

Shadow.SMALL = 'shadow_sm';
Shadow.MEDIUM = 'shadow_md';
Shadow.LARGE = 'shadow_lg';
Shadow.THIN = 'shadow_thin';
Shadow.GOBLIN = 'shadow_goblin';


// Adds 'splashy water' to the base of a thing when they enter water
export class Splash
{
    constructor(thing, ypos, playSound)
    {
        this.thing = thing;
        this.playSound = playSound;
        this.enabled = true;
        this.timer = 0;
        this.waterSprite = new PIXI.Sprite();
        this.waterSprite.anchor.set(0.5, 0.5);
        this.waterSprite.visible = false;
        this.waterSprite.texture = Resources.shared.getFrame('treading_water');
        this.waterSprite.y = ypos;
        this.thing.sprite.addChild(this.waterSprite);
    }

    get visible() {
        return this.waterSprite.visible;
    }

    set visible(value) {
        this.waterSprite.visible = value;
    }

    remove() {
        this.thing.sprite.removeChild(this.waterSprite);
    }

    update(dt)
    {
        let tile = this.thing.getTileUnder();

        if (tile && tile.type === 'water' && this.thing.fh === 0)
        {
            if (!this.visible && this.thing.isOnCamera && this.playSound) {
                Audio.playSound(RES.SPLASH_SND);
            }
            this.visible = true;
        }
        else
        {
            this.visible = false;
        }

        // Animate the splash a little bit (expand/contract as if the thing
        // is bobbing in the water)
        this.timer += dt;
        if (this.visible)
        {
            this.waterSprite.scale.set(
                1 + 0.08*Math.sin(this.timer*5)**2, 1
            );
        }
    }
}


// Adds an 'on fire' effect to a thing whenever it moves over lava
export class Flame
{
    constructor(thing, size)
    {
        this.thing = thing;
        this.flameSprite = new PIXI.Sprite(
            Resources.shared.getFrame(size || 'flame_small')
        );
        this.flameSprite.anchor.set(0.5, 1);
        this.thing.sprite.addChild(this.flameSprite);
        this.timer = 0;
    }

    get visible() {
        return this.flameSprite.visible;
    }

    set visible(value) {
        this.flameSprite.visible = value;
    }

    update(dt)
    {
        let tile = this.thing.getTileUnder();

        this.visible = (tile && tile.type === 'lava' && this.thing.fh === 0);
        if (this.visible)
        {
            this.timer += dt;
            if (Math.sin(15*this.timer) > 0) {
                this.flameSprite.scale.set(-1, 1);
            } else {
                this.flameSprite.scale.set(1, 1);
            }
        }
    }
}

Flame.SMALL = 'flame_small';
Flame.MEDIUM = 'flame_medium';
Flame.LARGE = 'flame_large';
