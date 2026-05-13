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
import { Render } from './render';
import { Level } from './level';


function shadowRenderer()
{
    let lastRenderer = null;
    let cache = {};
    function render(width, spread) {
        const renderer = Render.getRenderer();
        if (renderer !== lastRenderer) {
            // Soft reloads (eg during dev) can result in a new renderer, and
            // cache entries that can only be used by the old one.
            cache = {};
            lastRenderer = renderer;
        }
        if (cache[width]) {
            return cache[width];
        }
        const height = 1 + spread*2;
        const texture = PIXI.RenderTexture.create({ width: width, height: height });
        let graphics = new PIXI.Graphics().rect(0, spread, width, 1);
        for (let n = 1; n <= spread; n++) {
            const offset = 2*n-1;
            graphics = graphics.rect(offset, spread + n, width-2*offset, 1);
            graphics = graphics.rect(offset, spread - n, width-2*offset, 1);
        }
        graphics = graphics.fill({ color: 0x000000, alpha: 0.4 });
        renderer.render(graphics, { renderTexture: texture });
        cache[width] = texture;
        return texture;
    }
    return render;
}

const renderShadow = shadowRenderer();


// Adds a basic shadow to a thing. The shadow sprite always sticks to
// the floor and changes size slightly based on how far the thing
// moves vertically.
export class Shadow
{
    static SMALL = 5;
    static MEDIUM = 7;
    static LARGE = 9;

    constructor(thing, size, spread=1)
    {
        this.thing = thing;
        this.shadowSprite = new PIXI.Sprite();
        this.shadowSprite.anchor.set(0.5, 0.5);
        this.thing.sprite.addChildAt(this.shadowSprite, 0);
        this.size = size ?? Shadow.MEDIUM;
        this.spread = spread;
        this.rendered = false;
    }

    get visible() {
        return this.shadowSprite.visible;
    }

    set visible(value) {
        this.shadowSprite.visible = value;
    }

    update(dt)
    {
        if (!this.rendered) {
            this.shadowSprite.texture = renderShadow(this.size, this.spread);
            this.rendered = true;
        }
        // Make sure the shadow sticks to the ground
        const ground = this.thing.level.getHeightAt(this.thing.x, this.thing.y);
        if (this.thing.fh > ground) {
            this.shadowSprite.y = this.thing.fh - ground;
        } else {
            this.shadowSprite.y = 0;
        }
        // Have the shadow increase size slightly when the player is
        // further away from the floor.
        this.shadowSprite.scale.set(
            1 + this.thing.fh / 50.0,
            1 + this.thing.fh / 60.0
        );
    }

    remove() {
        this.thing.sprite.removeChild(this.shadowSprite);
    }
}


// Adds 'splashy water' to the base of a thing when they enter water
export class Splash
{
    constructor(thing, ypos, playSound)
    {
        const waterTexture = 'treading-water';
        this.thing = thing;
        this.playSound = playSound;
        this.enabled = true;
        this.timer = 0;
        this.waterSprite = new PIXI.Sprite();
        this.waterSprite.anchor = Resources.shared.getAnchor(waterTexture);
        this.waterSprite.visible = false;
        this.waterSprite.texture = Resources.shared.getFrame(waterTexture);
        this.waterSprite.zIndex = Level.BACKGROUND_POS;
        this.submersionDepth = 0.25;

        this.mask = new PIXI.Graphics().rect(
            -this.thing.width/2,
            -this.thing.height,
            this.thing.width,
            this.thing.height*(1 - this.submersionDepth)
        ).fill();
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
        const tile = this.thing.level.grid.getSubTileInfoAt(this.thing.x, this.thing.y);
        if (tile && tile === 'water' && this.thing.onGround)
        {
            if (!this.visible && this.thing.isOnCamera && this.playSound) {
                this.thing.level.groundStage.addChild(this.waterSprite);
                Audio.playSound(RES.SPLASH_SND, 0.5);
                this.thing.spriteChar.mask = this.mask;
                this.thing.spriteChar.addChild(this.mask);
            }
            this.waterSprite.x = this.thing.x;
            this.waterSprite.y = this.thing.y - this.thing.fh - this.thing.height*this.submersionDepth;
            this.visible = true;
        }
        else
        {
            this.thing.spriteChar.mask = null;
            this.thing.spriteChar.removeChild(this.mask);
            this.visible = false;
        }

        // Animate the splash a little bit (expand/contract as if the thing
        // is bobbing in the water)
        this.timer += dt;
        if (this.visible)
        {
            this.waterSprite.scale.set(
                1 + 0.1*Math.sin(this.timer*5)**2, 1
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
