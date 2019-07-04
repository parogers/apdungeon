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
import { Thing } from './thing';
import { Audio } from './audio';

var ARROW_FLIGHT = 0;
var ARROW_FALLING = 1;
var ARROW_DISAPPEAR = 2;

/*********/
/* Sword */
/*********/

export function SwordWeaponSlot(player)
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
    this.hitbox = new Thing.Hitbox(0, -4, 10, 6);
    // Which weapon texture is currently displayed
    this.textureName = null;
    this.setTexture("sword2");

    this.handleHitCallback = (function(hit) {
        if (hit.handleHit) {
            hit.handleHit(this.player.sprite.x, 
                          this.player.sprite.y, 1);
        }
    }).bind(this);
}

SwordWeaponSlot.prototype.update = function(dt)
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
SwordWeaponSlot.prototype.setTexture = function(name)
{
    if (this.textureName !== name) {
        this.sprite.texture = Utils.getFrame(RES.WEAPONS, name);
        this.textureName = name;
    }
}

SwordWeaponSlot.prototype.startAttack = function()
{
    if (this.attackCooldown > 0) return;

    Audio.playSound(RES.ATTACK_SWORD_SND);
    this.sprite.rotation = 0;
    this.sprite.x = 3.5;
    this.attackCooldown = 0.15;

    this.player.level.forEachThingHit(
        this.player.sprite.x + this.player.getFacing()*this.weaponReach, 
        this.player.sprite.y,
        this.hitbox, this.player,
        this.handleHitCallback);
}

SwordWeaponSlot.prototype.stopAttack = function()
{
}

/*******/
/* Bow */
/*******/

export function BowWeaponSlot(player)
{
    // Setup the weapon sprite (texture will come later)
    this.sprite = new PIXI.Sprite();
    this.sprite.anchor.set(6.5/8, 4/8.); // bow
    //this.weaponSprite.anchor.set(5.5/8, 4./8); // staff
    // Sprite position (relative to the player) and rotation
    this.player = player;
    this.attackCooldown = 0;
    this.textureName = null;
    this.setTexture("bow1");
}

BowWeaponSlot.prototype.update = function(dt)
{
    if (this.attackCooldown <= 0) {
        /* Have the bow rock back and forth as the player moves. */
        this.sprite.rotation = Math.PI/5 + 
            (Math.PI/40)*Math.cos(10*this.player.frame);
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
BowWeaponSlot.prototype.setTexture = function(name)
{
    if (this.textureName !== name) {
        this.sprite.texture = Utils.getFrame(RES.WEAPONS, name);
        this.textureName = name;
    }
}

BowWeaponSlot.prototype.startAttack = function()
{
    // Make sure we have an arrow to fire
    if (this.player.numArrows <= 0) return;
    if (this.attackCooldown > 0) return;
    Audio.playSound(RES.ATTACK_SWORD_SND);
    this.attackCooldown = 0.2;

    this.player.numArrows--;

    var arrow = new Arrow(
        this.player,
        this.player.sprite.x,
        this.player.sprite.y+this.sprite.y,
        this.player.getFacing()*100, 0,
        Math.abs(this.sprite.y));
    //level.things.push(arrow);
    //level.stage.addChild(arrow.sprite);
    this.player.level.addThing(arrow);
}

BowWeaponSlot.prototype.stopAttack = function()
{
}

export function Arrow(owner, x, y, velx, vely, height)
{
    this.owner = owner;
    this.sprite = new PIXI.Sprite(Utils.getFrame(RES.WEAPONS, "arrow"));
    this.sprite.anchor.set(0.5, 0.5);
    this.sprite.scale.x = Math.sign(velx);
    this.sprite.scale.y = 1;
    this.sprite.x = x;
    this.sprite.y = y;
    this.velx = velx;
    this.vely = vely;
    this.height = height;
    this.state = ARROW_FLIGHT;
    this.timer = 0;
    this.hitbox = new Thing.Hitbox(0, 0, 5, 5);
}

Arrow.prototype.update = function(dt)
{
    var level = this.owner.level;
    if (this.state === ARROW_FLIGHT) {
        this.sprite.x += this.velx*dt;
        this.sprite.y += this.vely*dt;
        // The arrow disappears when it's no longer visible
        if (this.sprite.x < level.camera.x || 
            this.sprite.x > level.camera.x + level.camera.width) 
        {
            level.removeThing(this);
        }
        // Check if the arrow hits a wall
        var tile = level.bg.getTileAt(
            this.sprite.x+Math.sign(this.velx)*4,
            this.sprite.y+this.height);
        if (tile.solid) {
            this.velx *= -0.25;
            this.vely = 0;
            this.state = ARROW_FALLING;
            Audio.playSound(RES.ARROW_DING_SND, 0.4);
            return;
        }
        // Now check if we've hit an enemy
        var other = level.checkHit(
            this.sprite.x, this.sprite.y, 
            this.hitbox, this.owner);
        if (other && other.handleHit) {
            var ret = other.handleHit(this.sprite.x, this.sprite.y, 1);
            if (ret === true) {
                level.removeThing(this);
            }
        }

    } else if (this.state === ARROW_FALLING) {
        this.vely -= 700*dt;
        this.height += this.vely*dt;
        this.sprite.x += this.velx*dt;
        this.sprite.y -= this.vely*dt;
        if (this.height <= 0) {
            this.timer = 1;
            this.state = ARROW_DISAPPEAR;
        }
    } else {
        this.timer -= dt;
        if (this.timer <= 0) level.removeThing(this);
    }
}
