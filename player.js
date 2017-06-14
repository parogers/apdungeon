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
    this.velx = 0;
    this.vely = 0;
    this.accelx = 0;
    this.accely = 0;
    this.frame = 0;
    this.count = 0;
    this.facing = 1;
    this.maxSpeed = 200; // pixels/second
    this.setCharFrames(FEMALE_MELEE, "melee1");
    /* Setup a PIXI container to hold the player sprite, and any other 
     * equipment they're carrying. */
    this.sprite = new PIXI.Container();
    // Setup the player sprite (texture comes later)
    this.spriteChar = new PIXI.Sprite();
    this.spriteChar.scale.set(SCALE);
    this.spriteChar.anchor.set(0.5, 1);
    this.sprite.addChild(this.spriteChar);
    // Setup the sprite for when the player is treading water
    this.waterSprite = createSplashSprite();
    this.waterSprite.y = -1.5*SCALE;
    this.sprite.addChild(this.waterSprite);

    /*shadowSprite = new PIXI.Sprite();
    shadowSprite.scale.set(SCALE);
    shadowSprite.anchor.set(0.5, 0.5);
    shadowSprite.visible = false;
    shadowSprite.texture = getTextures(MAPTILES)["treading_water"];*/

    this.weaponSlot = new BowWeaponSlot(this);
    this.sprite.addChild(this.weaponSlot.sprite);
    // Define the hitbox
    this.hitbox = new Hitbox(0, 0, 8*SCALE, 8*SCALE);

    this.armour = Item.NONE;
}

Player.prototype.update = function(dt)
{
    var dirx = controls.getX();
    var diry = controls.getY();

    this.count += dt;

    if (dirx) {
	// Handle walking left/right by mirroring the sprite
	this.sprite.scale.x = Math.abs(this.sprite.scale.x)*dirx;
	this.velx = dirx * this.maxSpeed;
	this.facing = Math.sign(dirx);
    } else {
	this.velx *= 0.75;
    } 

    if (diry) {
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
    var w = this.spriteChar.texture.width*SCALE*0.75;

    // Handle left/right movement
    if (this.velx) {
	var x = this.sprite.x + this.velx*dt;
	var left = level.bg.getTileAt(x-w/2, this.sprite.y);
	var right = level.bg.getTileAt(x+w/2, this.sprite.y);
	// Keep the player visible to the camera
	if (!left.solid && !right.solid && 
	    x-10 >= level.camera.x && 
	    x+10 <= level.camera.x + level.camera.width) {
	    this.sprite.x = x;
	} else {
	    this.velx = 0;
	}
    }
    if (this.vely) {
	var y = this.sprite.y + this.vely*dt;
	var left = level.bg.getTileAt(this.sprite.x-w/2, y);
	var right = level.bg.getTileAt(this.sprite.x+w/2, y);
	if (!left.solid && !right.solid) {
	    this.sprite.y = y;
	} else {
	    this.vely = 0;
	}
    }

    // Make a splashy sound when we enter water
    var tile = level.bg.getTileAt(this.sprite.x, this.sprite.y);
    if (tile.water) {
	if (!this.waterSprite.visible) sounds[SPLASH_SND].play();
	this.waterSprite.visible = true;
    } else {
	this.waterSprite.visible = false;
    }

    // Handle attacking
    if (this.weaponSlot) 
    {
	if (controls.primary && !controls.lastPrimary)
	{
	    // Just hit the attack button
	    this.weaponSlot.startAttack();
	}
	if (!controls.primary && controls.lastPrimary)
	{
	    // Just released the attack button
	    this.weaponSlot.stopAttack();
	}
	if (this.weaponSlot.update) this.weaponSlot.update(dt);
    }

    // Check for collisions with other things
    var hit = level.checkHitMany(this.sprite.x, this.sprite.y, 
				 this.hitbox, this);
    for (var n = 0; n < hit.length; n++) {
	if (hit[n].handlePlayerCollision) {
	    hit[n].handlePlayerCollision();
	}
    }

    // Update animation
    var frame = this.frames[((this.frame*10)|0) % this.frames.length];
    this.spriteChar.texture = frame;
}

Player.prototype.setCharFrames = function(res, name)
{
    this.frames = getFrames(
	res, name + "_south_1", name + "_south_2", name + "_south_3");
}

Player.prototype.setArmour = function(item)
{
    var img = "melee1";
    if (item === Item.LEATHER_ARMOUR) img = "melee2";
    else if (item == Item.STEEL_ARMOUR) img = "melee3";
    this.setCharFrames(FEMALE_MELEE, img);
    this.armour = item;
}

Player.prototype.handleTakeItem = function(item)
{
    switch (item) {
    case Item.LEATHER_ARMOUR:
	if (this.armour == Item.NONE) {
	    this.setArmour(item);
	    sounds[POWERUP2_SND].play();
	    return true;
	}
	break;

    case Item.STEEL_ARMOUR:
	if (this.armour == Item.NONE || this.armour == Item.LEATHER_ARMOUR) {
	    this.setArmour(item);
	    sounds[POWERUP2_SND].play();
	    return true;
	}
	break;
    }
    sounds[COIN_SND].play();
    return true;
}


