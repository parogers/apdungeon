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

// What tint of colour to use when the player takes damage
var DAMAGE_TINT = 0xFF0000;
var NO_TINT = 0xFFFFFF;

function Player()
{
    this.sprite = null;
    this.velx = 0;
    this.vely = 0;
    this.accelx = 0;
    this.accely = 0;
    this.frame = 0;
    this.frames = null;
    this.lungeFrame = null;
    this.count = 0;
    this.facing = 1;
    // Player health in half hearts. This should always be a multiple of two
    this.maxHealth = 10;
    this.health = this.maxHealth;
    this.maxSpeed = 40; // pixels/second
    // Inventory stuff
    this.numCoins = 0;
    this.numArrows = 0;
    this.armour = Item.NONE;
    this.bow = Item.NONE;
    this.sword = Item.NONE;
    // Whether the user has free control over the player (set to false 
    // during a cutscene)
    this.hasControl = true;
    this.dirx = 0;
    this.diry = 0;
    // Process of dying (showing animation)
    this.dying = false;
    // Actually dead
    this.dead = false;
    // The number of kills (stored by monster name). Also stores the 
    // image of the monster (for displaying stats later)
    //     {count: ZZZ, img: ZZZ}
    this.kills = {};

    // Whether the player movement is restricted by the camera position.
    // Disabled during cut scenes and whatnot.
    this.cameraMovement = true;

    /*this.handleMonsterKilled(new Snake());
    this.handleMonsterKilled(new Goblin());
    this.handleMonsterKilled(new Rat());
    this.handleMonsterKilled(new Scorpion());
    this.handleMonsterKilled(new SkelWarrior());
    this.handleMonsterKilled(new Ghost());*/

    //this.weapon = Item.NONE; // current weapon
    // Define the hitbox
    this.hitbox = new Hitbox(0, -4, 6, 6);

    this.setCharFrames(RES.FEMALE_MELEE, "melee1");
    /* Setup a PIXI container to hold the player sprite, and any other 
     * equipment they're carrying. */
    this.sprite = new PIXI.Container();
    // Setup the player sprite (texture comes later)
    this.spriteChar = new PIXI.Sprite();
    this.spriteChar.anchor.set(0.5, 1);
    this.sprite.addChild(this.spriteChar);
    // Setup the sprite for when the player is treading water
    this.waterSprite = createSplashSprite();
    this.waterSprite.y = -1.5;
    this.sprite.addChild(this.waterSprite);

    // Minimum amount of time after taking damage, until the player can be
    // damaged again.
    this.damageCooldown = 1;
    // The timer used for tracking the cooldown
    this.damageTimer = 0;

    this.weaponSlot = null;

    // Knockback timer and speed
    this.knockedTimer = 0;
    this.knocked = 0;
    // Weapon slots are used to manage the weapon sprite. (ie attack and
    // running animations, etc) We add both slot sprites to the player sprite,
    // then use the 'visible' flag to control which is rendered.
    this.bowWeaponSlot = new BowWeaponSlot(this);
    this.swordWeaponSlot = new SwordWeaponSlot(this);
    this.sprite.addChild(this.bowWeaponSlot.sprite);
    this.sprite.addChild(this.swordWeaponSlot.sprite);
    this.bowWeaponSlot.sprite.visible = false;
    this.swordWeaponSlot.sprite.visible = false;
    //this.setWeapon(Item.SMALL_BOW);
}

Player.prototype.faceDirection = function(dirx)
{
    this.sprite.scale.x = Math.abs(this.sprite.scale.x)*Math.sign(dirx);
}

Player.prototype.update = function(dt)
{
    var dirx = 0;
    var diry = 0;

    if (this.dead) return;

    // Handle dying state animation
    if (this.dying) {
	this.frame += 2.5*dt;
	if (this.frame > this.dyingFrames.length-1) {
	    this.frame = this.dyingFrames.length-1;
	    this.dead = true;
	}
	var frame = this.dyingFrames[(this.frame)|0];
	this.spriteChar.texture = frame;
	return;
    }

    // Check if the player has just died
    if (this.health <= 0) {
	this.dying = true;
	this.frame = 0;
	this.weaponSlot = null;
	this.updatePlayerAppearance();
	this.spriteChar.tint = NO_TINT;
	// Bring the player corpse to the front (so it's rendered very 
	// clearly overtop any other junk in the scene)
	this.level.stage.removeChild(this.sprite);
	this.level.stage.addChild(this.sprite);
	return;
    }

    if (this.knockedTimer <= 0) {
	if (this.hasControl) {
	    dirx = controls.getX();
	    diry = controls.getY();
	} else {
	    dirx = this.dirx;
	    diry = this.diry;
	}
    } else {
	this.velx = this.knocked;
	this.knockedTimer -= dt;
    }

    if (this.damageTimer > 0) {
	this.damageTimer -= dt;
	if (this.damageTimer <= 0 || 
	    this.damageCooldown-this.damageTimer > 0.1) 
	{
	    // Stop flashing red
	    this.spriteChar.tint = NO_TINT;
	}
    }
    this.count += dt;

    if (dirx) {
	// Handle walking left/right by mirroring the sprite
	this.sprite.scale.x = Math.abs(this.sprite.scale.x)*Math.sign(dirx);
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

    var speed = Math.sqrt(this.velx*this.velx + this.vely*this.vely);
    if (speed > this.maxSpeed) {
	this.velx = this.velx * (this.maxSpeed/speed);
	this.vely = this.vely * (this.maxSpeed/speed);
    }
    var w = this.spriteChar.texture.width*0.75;

    // Handle left/right movement
    if (this.velx) {
	var x = this.sprite.x + this.velx*dt;
	var left = this.level.bg.getTileAt(x-w/2, this.sprite.y);
	var right = this.level.bg.getTileAt(x+w/2, this.sprite.y);
	// Keep the player visible to the camera (unless camera mode disabled)
	if (!left.solid && !right.solid && (
	    !this.cameraMovement || (
		x-w/2 >= this.level.camera.x && 
		x+w/2 <= this.level.camera.x + this.level.camera.width))) {
	    this.sprite.x = x;
	} else {
	    this.velx = 0;
	}
    }
    if (this.vely) {
	var y = this.sprite.y + this.vely*dt;
	var left = this.level.bg.getTileAt(this.sprite.x-w/2, y);
	var right = this.level.bg.getTileAt(this.sprite.x+w/2, y);
	if (!left.solid && !right.solid) {
	    this.sprite.y = y;
	} else {
	    this.vely = 0;
	}
    }

    // Make a splashy sound when we enter water
    var tile = this.level.bg.getTileAt(this.sprite.x, this.sprite.y);
    if (tile.water) {
	if (!this.waterSprite.visible) getSound(RES.SPLASH_SND).play();
	this.waterSprite.visible = true;
    } else {
	this.waterSprite.visible = false;
    }

    if (controls.testKey && !controls.lastTestKey) this.health = 0;

    // Handle attacking
    if (this.weaponSlot && this.hasControl) 
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

    if (controls.swap && !controls.lastSwap) {
	this.swapWeapons();
    }

    // Check for collisions with other things
    var hit = this.level.checkHitMany(
	this.sprite.x, this.sprite.y, 
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
	res, 
	[name + "_south_1", 
	 name + "_south_2", 
	 name + "_south_3"]);
    this.lungeFrame = getFrame(res, name + "_lunge_1");
    this.dyingFrames = getFrames(
	res, 
	["melee1_dying_1", 
	 "melee1_dying_2", 
	 "melee1_dying_3"]);
}

Player.prototype.setArmour = function(item)
{
    // Change the player appearance based on their armour
    this.armour = item;
    this.updatePlayerAppearance();
}

Player.prototype.updatePlayerAppearance = function()
{
    // Update the player character sprite, based on the armour we're wearing
    var img = "melee1";
    if (this.armour === Item.LEATHER_ARMOUR) img = "melee2";
    else if (this.armour == Item.STEEL_ARMOUR) img = "melee3";
    this.setCharFrames(RES.FEMALE_MELEE, img);
    // Update the sword sprite
    // ...
    // Update the bow sprite
    // ...
    var b = (this.weaponSlot === this.bowWeaponSlot);
    this.bowWeaponSlot.sprite.visible = b;

    var b = (this.weaponSlot === this.swordWeaponSlot);
    this.swordWeaponSlot.sprite.visible = b;

    if (this.weaponSlot) this.weaponSlot.update(0);
}

Player.prototype.upgradeSword = function(item)
{
    // Switch over to the sword if we don't have a weapon equipped
    if (!this.weaponSlot) {
	this.weaponSlot = this.swordWeaponSlot;
    }
    this.sword = item;
    this.updatePlayerAppearance();
}

Player.prototype.upgradeBow = function(item)
{
    // Switch over to the bow if we don't have a weapon equipped
    if (!this.weaponSlot) {
	this.weaponSlot = this.bowWeaponSlot;
    }
    this.bow = item;
    this.updatePlayerAppearance();
}

Player.prototype.upgradeArmour = function(item)
{
    this.setArmour(item);
    getSound(RES.POWERUP2_SND).play();
}

Player.prototype.healDamage = function(amt)
{
    if (this.health < this.maxHealth) {
	this.health = Math.min(this.health+amt, this.maxHealth);
	getSound(RES.POWERUP4_SND).volume = 1.25;
	getSound(RES.POWERUP4_SND).play();
    }
}

Player.prototype.takeDamage = function(amt, src)
{
    if (this.damageTimer <= 0) 
    {
	// Adjust the damage parameters based on our armour
	var cooldown = this.damageCooldown;
	var knockedVel = 100;
	var knockedTimer = 0.1;

	if (this.armour === Item.LEATHER_ARMOUR) {
	    cooldown = this.damageCooldown*1.25;
	    knockedVel = 90;
	    knockedTimer = 0.08;
	    if (randint(1, 4) === 1) {
		if (amt > 1) amt--;
	    }
	} else if (this.armour === Item.STEEL_ARMOUR) {
	    cooldown = this.damageCooldown*1.5;
	    knockedVel = 80;
	    knockedTimer = 0.05;
	    if (randint(1, 2) === 1) {
		amt--;
	    }
	}

	getSound(RES.HIT_SND).play();

	// Take damage and have the player flash red for a moment
	this.health -= amt;
	this.damageTimer = this.damageCooldown;
	this.spriteChar.tint = DAMAGE_TINT;
	// Knock the player back a bit too
	this.knocked = knockedVel*Math.sign(this.sprite.x - src.sprite.x);
	this.knockedTimer = knockedTimer;
    }
}

Player.prototype.swapWeapons = function()
{
    if (this.weaponSlot === this.swordWeaponSlot && this.bow) {
	this.weaponSlot = this.bowWeaponSlot;
	this.updatePlayerAppearance();
    } else if (this.weaponSlot === this.bowWeaponSlot && this.sword) {
	this.weaponSlot = this.swordWeaponSlot;
	this.updatePlayerAppearance();
    }
}

/* Called when a monster (thing) is killed by the player */
Player.prototype.handleMonsterKilled = function(monster)
{
    if (this.kills[monster.name] === undefined) {
	this.kills[monster.name] = {count: 0, img: monster.frames[0]};
    }
    this.kills[monster.name].count++;
}

/* Called when the player walks over a takeable item (GroundItem). The item
 * number is passed in here. (Item.ZZZ) */
Player.prototype.handleTakeItem = function(item)
{
    // Check for an armour upgrade
    if (isArmour(item) && isArmourBetter(this.armour, item)) {
	this.upgradeArmour(item);
	return true;
    }
    // Check for a sword upgrade
    if (isSword(item) && isSwordBetter(this.sword, item)) {
	this.upgradeSword(item);
	return true;
    }
    // Check for a bow upgrade
    if (isBow(item) && isBowBetter(this.bow, item)) {
	this.upgradeBow(item);
	return true;
    }
    // Consumable items
    switch (item) {
    case Item.ARROW:
	this.numArrows += 5;
	break;

    case Item.COIN:
	this.numCoins++;
	break;

    case Item.SMALL_HEALTH:
	this.healDamage(2);
	break;

    case Item.LARGE_HEALTH:
	this.healDamage(this.maxHealth);
	break;
    }
    getSound(RES.COIN_SND).play();
    return true;
}
