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

function Player()
{
    this.sprite = null;
    this.weaponSprite = null;
    this.velx = 0;
    this.vely = 0;
    this.accelx = 0;
    this.accely = 0;
    this.frame = 0;
    this.count = 0;
    this.maxSpeed = 200; // pixels/second
    this.southFrames = ["melee1_south_1", "melee1_south_2", "melee1_south_3"];
    this.frames = this.southFrames;
    /* Setup a PIXI container to hold the player sprite, and any other 
     * equipment they're carrying. */
    this.sprite = new PIXI.Container();
    // Setup the player sprite (texture comes later)
    this.spriteChar = new PIXI.Sprite();
    this.spriteChar.scale.set(SCALE);
    this.spriteChar.anchor.set(0.5, 1);
    this.sprite.addChild(this.spriteChar);
    // Setup the sprite for when the player is treading water
    this.waterSprite = new PIXI.Sprite();
    this.waterSprite.scale.set(SCALE);
    this.waterSprite.anchor.set(0.5, 0.5);
    this.waterSprite.y = -1.5*SCALE;
    this.waterSprite.visible = false;
    this.sprite.addChild(this.waterSprite);
    // Setup the weapon sprite (texture will come later)
    this.weaponSprite = new PIXI.Sprite();
    //this.weaponSprite.anchor.set(6.5/8, 4/8.); // bow
    this.weaponSprite.anchor.set(4.5/8, 4.5/8); // sword
    //this.weaponSprite.anchor.set(5.5/8, 4./8); // staff
    this.weaponSprite.scale.set(SCALE);
    this.sprite.addChild(this.weaponSprite);
}

Player.prototype.update = function(dt)
{
    var dirx = controls.getX();
    var diry = controls.getY();

    this.count += dt;

    if (dirx) {
	// Handle walking left/right by mirroring the sprite
	this.sprite.scale.x = Math.abs(
	    this.sprite.scale.x)*dirx;
	this.velx = dirx * this.maxSpeed;
    } else {
	this.velx *= 0.75;
    } 

    if (diry) {
	//if (diry > 0) this.frames = this.southFrames;
	//else this.frames = this.northFrames;
	this.vely = diry * this.maxSpeed;
    } else {
	this.vely *= 0.75;
    }

    if (dirx || diry) {
	this.frame += dt;
    } else {
	this.frame = 0;
    }

    //this.sprite.rotation += dt;
    //this.velx += this.accelx*dt;
    //this.vely += this.accely*dt;

    var speed = Math.sqrt(this.velx*this.velx + this.vely*this.vely);
    if (speed > this.maxSpeed) {
	this.velx = this.velx * (this.maxSpeed/speed);
	this.vely = this.vely * (this.maxSpeed/speed);
    }
    var x = this.sprite.x + this.velx*dt;
    var y = this.sprite.y + this.vely*dt;
    var w = this.spriteChar.texture.width*SCALE*0.75;

    if (this.velx) {
	var left = bg.getTileAt(x-w/2, this.sprite.y);
	var right = bg.getTileAt(x+w/2, this.sprite.y);
	if (!left.solid && !right.solid) {
	    this.sprite.x = x;
	} else {
	    this.velx = 0;
	}
    }
    if (this.vely) {
	var left = bg.getTileAt(this.sprite.x-w/2, y);
	var right = bg.getTileAt(this.sprite.x+w/2, y);
	if (!left.solid && !right.solid) {
	    this.sprite.y = y;
	} else {
	    this.vely = 0;
	}
    }

    var tile = bg.getTileAt(this.sprite.x, this.sprite.y);
    this.waterSprite.visible = (tile.name === "water");

    if (this.weaponSprite) {
	/* Have the bow rock back and forth as the player moves. */
	/*this.weaponSprite.x = 4.25*SCALE;
	this.weaponSprite.y = -0.5*SCALE;
	this.weaponSprite.rotation = Math.PI/6 + 
	    (Math.PI/40)*Math.cos(10*this.frame);*/

	/* Sword placement */
	this.weaponSprite.x = 2.25*SCALE;
	this.weaponSprite.y = -3.3*SCALE;
	this.weaponSprite.rotation = -Math.PI/4;

	if (controls.primary && !controls.lastPrimary)
	{
	    sounds[ATTACK_SWORD_SND].play();
	}

	if (controls.primary) {
	    this.weaponSprite.rotation = 0;
	    this.weaponSprite.x = 3.5*SCALE;
	} 

	/* Staff placement */
	/*this.weaponSprite.x = 3.4*SCALE;
	this.weaponSprite.y = -4*SCALE;
	this.weaponSprite.rotation = 0;*/
    }

    //var imgs = PIXI.loader.resources[FEMALE_MELEE].textures;
    var imgs = getTextures(FEMALE_MELEE);
    var frame = this.frames[((this.frame*10)|0) % this.frames.length];
    this.spriteChar.texture = imgs[frame];
}
