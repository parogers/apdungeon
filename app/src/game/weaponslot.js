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
import { Thing, Hitbox } from './thing';
import { Audio } from './audio';

const ARROW_FLIGHT = 0;
const ARROW_FALLING = 1;
const ARROW_DISAPPEAR = 2;

/*********/
/* Sword */
/*********/

export class SwordWeaponSlot
{
    constructor(player)
    {
        // Setup the weapon sprite (texture will come later)
        this.sprite = new PIXI.Sprite();
        //this.weaponSprite.anchor.set(6.5/8, 4/8.); // bow
        this.sprite.anchor.set(4./8, 3.9/8); // sword
        //this.weaponSprite.anchor.set(5.5/8, 4./8); // staff
        // Sprite position (relative to the player) and rotation
        this.sprite.x = 2.5;
        this.sprite.y = -4;
        this.sprite.rotation = -Math.PI/3;
        this.attackCooldown = 0;
        this.weaponReach = 3.25;
        this.player = player;
        this.hitbox = new Hitbox(0, -4, 10, 6);
        // Which weapon texture is currently displayed
        this.textureName = null;
        this.setTexture('sword2');

        this.handleHitCallback = (function(hit) {
            if (hit.handleHit) {
                hit.handleHit(this.player.fx, 
                              this.player.fy, 1);
            }
        }).bind(this);
    }

    update(dt)
    {
        if (this.attackCooldown > 0) {
            this.attackCooldown -= dt;
            if (this.attackCooldown <= 0) {
                this.sprite.x = 2.5;
                this.sprite.rotation = -Math.PI/3;
            }
        }

        /* Staff placement */
        /*this.weaponSprite.x = 3.4*SCALE;
          this.weaponSprite.y = -4*SCALE;
          this.weaponSprite.rotation = 0;*/
    }

    // Set which sword to display. The sprite is taken from the WEAPONS sheet
    setTexture(name)
    {
        if (this.textureName !== name) {
            this.sprite.texture = Utils.getFrame(RES.WEAPONS, name);
            this.textureName = name;
        }
    }

    startAttack()
    {
        if (this.attackCooldown > 0) return;

        Audio.playSound(RES.ATTACK_SWORD_SND);
        this.sprite.rotation = 0;
        this.sprite.x = 3.5;
        this.attackCooldown = 0.15;

        this.player.level.forEachThingHit(
            this.player.fx + this.player.facing*this.weaponReach, 
            this.player.fy,
            this.hitbox, this.player,
            this.handleHitCallback);
    }

    stopAttack()
    {
    }
}

/*******/
/* Bow */
/*******/

export class BowWeaponSlot
{
    constructor(player)
    {
        // Setup the weapon sprite (texture will come later)
        this.sprite = new PIXI.Sprite();
        this.sprite.anchor.set(6.5/8, 4/8.); // bow
        //this.weaponSprite.anchor.set(5.5/8, 4./8); // staff
        // Sprite position (relative to the player) and rotation
        this.player = player;
        this.attackCooldown = 0;
        this.textureName = null;
        this.setTexture('bow1');
        // Vertical offset from the player position where the arrow
        // is fired.
        this.arrowFireHeight = 2.5;
    }

    update(dt)
    {
        if (this.attackCooldown <= 0) {
            /* Have the bow rock back and forth as the player moves. */
            //this.sprite.rotation = Math.PI/5 + 
            //(Math.PI/40)*Math.cos(10*this.player.frame);
            this.sprite.rotation = Math.PI/5;
            this.sprite.x = 3.0;
            this.sprite.y = -2.5;
        } else {
            this.sprite.rotation = 0;
            this.sprite.x = 3;
            this.sprite.y = -3.25;
            this.attackCooldown -= dt;
        }
        /* Staff placement */
        /*this.weaponSprite.x = 3.4*SCALE;
          this.weaponSprite.y = -4*SCALE;
          this.weaponSprite.rotation = 0;*/
    }

    // Set which bow to display. The sprite is taken from the WEAPONS sheet
    setTexture(name)
    {
        if (this.textureName !== name) {
            this.sprite.texture = Utils.getFrame(RES.WEAPONS, name);
            this.textureName = name;
        }
    }

    startAttack()
    {
        // Make sure we have an arrow to fire
        if (this.player.numArrows <= 0) return;
        if (this.attackCooldown > 0) return;
        Audio.playSound(RES.ATTACK_SWORD_SND);
        this.attackCooldown = 0.15;

        this.player.numArrows--;

        let arrow = new Arrow(
            this.player,
            this.player.fx,
            this.player.fy,
            this.player.baseSpeed + this.player.facing*50, 0,
            this.arrowFireHeight);
        this.player.level.addThing(arrow);
    }

    stopAttack()
    {
    }
}

/*********/
/* Arrow */
/*********/

export class Arrow extends Thing
{
    constructor(owner, x, y, velx, vely, h)
    {
        super();
        this.owner = owner;
        this.arrowSprite = new PIXI.Sprite(
            Utils.getFrame(RES.WEAPONS, 'arrow')
        );
        this.arrowSprite.anchor.set(0.5, 0.5);
        this.arrowSprite.scale.x = Math.sign(velx);
        this.arrowSprite.scale.y = 1;
        this.sprite.addChild(this.arrowSprite);
        this.fx = x;
        this.fy = y;
        this.fh = h;
        this.velx = velx;
        this.vely = vely;
        this.velh = 0;
        this.state = ARROW_FLIGHT;
        this.timer = 0;
        this.hitbox = new Hitbox(0, 0, 8, 4);
    }

    update(dt)
    {
        let level = this.owner.level;
        if (this.state === ARROW_FLIGHT)
        {
            this.fx += this.velx*dt;
            this.fy += this.vely*dt;
            // The arrow disappears when it's no longer visible
            if (this.sprite.x < level.camera.x || 
                this.sprite.x > level.camera.x + level.camera.width) 
            {
                this.removeSelf();
            }
            // Check if the arrow hits a wall
            let tile = level.getTileAt(
                this.sprite.x + Math.sign(this.velx)*4,
                this.sprite.y + this.fh
            );

            if (tile.solid)
            {
                this.velx *= -0.25;
                this.vely = 0;
                this.velh = 0;
                this.state = ARROW_FALLING;
                Audio.playSound(RES.ARROW_DING_SND, 0.4);
                return;
            }
            // Now check if we've hit an enemy
            let other = level.checkHit(
                this.sprite.x,
                this.sprite.y, 
                this.hitbox,
                this.owner
            );
            if (other && other.handleHit)
            {
                let ret = other.handleHit(
                    this.sprite.x,
                    this.sprite.y,
                    1
                );
                if (ret === true) {
                    this.removeSelf();
                }
            }

        } else if (this.state === ARROW_FALLING) {
            this.velh -= 500*dt;
            this.fh += this.velh*dt;
            this.fx += this.velx*dt;
            if (this.fh <= 0) {
                this.timer = 1;
                this.state = ARROW_DISAPPEAR;
            }
        } else {
            this.timer -= dt;
            if (this.timer <= 0) this.removeSelf();
        }
    }
}
