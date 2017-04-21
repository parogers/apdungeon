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

ARROW_FLIGHT = 0;
ARROW_FALLING = 1;
ARROW_DISAPPEAR = 2;

/*********/
/* Sword */
/*********/

function SwordWeaponSlot(player)
{
    // Setup the weapon sprite (texture will come later)
    this.sprite = new PIXI.Sprite(getTextures(WEAPONS)["sword2"]);
    //this.weaponSprite.anchor.set(6.5/8, 4/8.); // bow
    this.sprite.anchor.set(4./8, 3.9/8); // sword
    //this.weaponSprite.anchor.set(5.5/8, 4./8); // staff
    this.sprite.scale.set(SCALE);
    // Sprite position (relative to the player) and rotation
    this.sprite.x = 2.5*SCALE;
    this.sprite.y = -4*SCALE;
    this.sprite.rotation = -Math.PI/3;
    this.attackCooldown = 0;
    this.player = player;
    this.hitbox = new Hitbox(0, -4*SCALE, 10*SCALE, 6*SCALE);
}

SwordWeaponSlot.prototype.update = function(dt)
{
    if (this.attackCooldown > 0) {
	this.attackCooldown -= dt;
	if (this.attackCooldown <= 0) {
	    this.sprite.x = 2.5*SCALE;
	    this.sprite.rotation = -Math.PI/3;
	}
    }

    /* Staff placement */
    /*this.weaponSprite.x = 3.4*SCALE;
      this.weaponSprite.y = -4*SCALE;
      this.weaponSprite.rotation = 0;*/
}

SwordWeaponSlot.prototype.startAttack = function()
{
    if (this.attackCooldown > 0) return;

    sounds[ATTACK_SWORD_SND].play();
    this.sprite.rotation = 0;
    this.sprite.x = 3.5*SCALE;

    var lst = level.checkHitMany(
	this.player.sprite.x + this.player.facing*3*SCALE, 
	this.player.sprite.y,
	this.hitbox, this.player);

/*[
	{
	    x: this.player.sprite.x + this.player.facing*35,
	    y: this.player.sprite.y + this.sprite.y
	},
	{
	    x: this.player.sprite.x + this.player.facing*5,
	    y: this.player.sprite.y + this.sprite.y
	},
	{
	    x: this.player.sprite.x + this.player.facing*25,
	    y: this.player.sprite.y + this.sprite.y-10
	}], this.player);*/

    for (var n = 0; n < lst.length; n++) {
	if (lst[n].handleHit) {
	    lst[n].handleHit(this.player.sprite.x, 
			     this.player.sprite.y, 1);
	}
    }
    this.attackCooldown = 0.15;
}

SwordWeaponSlot.prototype.stopAttack = function()
{
}

/*******/
/* Bow */
/*******/

function BowWeaponSlot(player)
{
    // Setup the weapon sprite (texture will come later)
    this.sprite = new PIXI.Sprite(getTextures(WEAPONS)["bow1"]);
    this.sprite.anchor.set(6.5/8, 4/8.); // bow
    //this.weaponSprite.anchor.set(5.5/8, 4./8); // staff
    this.sprite.scale.set(SCALE);
    // Sprite position (relative to the player) and rotation
    this.player = player;
    this.attackCooldown = 0;
}

BowWeaponSlot.prototype.update = function(dt)
{
    if (this.attackCooldown <= 0) {
	/* Have the bow rock back and forth as the player moves. */
	this.sprite.rotation = Math.PI/5 + 
	    (Math.PI/40)*Math.cos(10*this.player.frame);
	this.sprite.x = 3.*SCALE;
	this.sprite.y = -2.5*SCALE;
    } else {
	this.sprite.rotation = 0;
	this.sprite.x = 3*SCALE;
	this.sprite.y = -3.25*SCALE;
	this.attackCooldown -= dt;
    }
    /* Staff placement */
    /*this.weaponSprite.x = 3.4*SCALE;
      this.weaponSprite.y = -4*SCALE;
      this.weaponSprite.rotation = 0;*/
}

BowWeaponSlot.prototype.startAttack = function()
{
    if (this.attackCooldown > 0) return;
    sounds[ATTACK_SWORD_SND].play();
    this.attackCooldown = 0.2;

    var arrow = new Arrow(
	this.player.sprite.x,
	this.player.sprite.y+this.sprite.y,
	this.player.facing*500, 0,
	Math.abs(this.sprite.y));
    //level.things.push(arrow);
    //level.stage.addChild(arrow.sprite);
    level.addThing(arrow);
}

BowWeaponSlot.prototype.stopAttack = function()
{
}

function Arrow(x, y, velx, vely, height)
{
    this.sprite = new PIXI.Sprite(getTextures(WEAPONS)["arrow"]);
    this.sprite.anchor.set(0.5, 0.5);
    this.sprite.scale.x = Math.sign(velx)*SCALE;
    this.sprite.scale.y = SCALE;
    this.sprite.x = x;
    this.sprite.y = y;
    this.velx = velx;
    this.vely = vely;
    this.height = height;
    this.state = ARROW_FLIGHT;
    this.timer = 0;
    this.hitbox = new Hitbox(0, 0, 5, 5);
}

Arrow.prototype.update = function(dt)
{
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
	    this.sprite.x+Math.sign(this.velx)*20,
	    this.sprite.y+this.height);
	if (tile.solid) {
	    this.velx *= -0.25;
	    this.vely = 0;
	    this.state = ARROW_FALLING;
	    sounds[ARROW_DING_SND].volume = 0.4;
	    sounds[ARROW_DING_SND].play();
	    return;
	}
	// Now check if we've hit an enemy
	var other = level.checkHit(
	    this.sprite.x, this.sprite.y, 
	    this.hitbox, this.player);
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

