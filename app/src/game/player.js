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

import { renderText } from './ui';
import { RES } from './res';
import { Utils } from './utils';
import { Item } from './item';
import { Thing, Hitbox } from './thing';
import { BowWeaponSlot, SwordWeaponSlot } from './weaponslot';
import { Audio } from './audio';

// What tint of colour to use when the player takes damage
var DAMAGE_TINT = 0xFF0000;
var NO_TINT = 0xFFFFFF;

export class Player extends Thing
{

    constructor(controls)
    {
        super();
        this.controls = controls;
        this.sprite = null;
        this.velx = 0;
        this.vely = 0;
        this.accelx = 0;
        this.accely = 0;
        this.frame = 0;
        this.frames = null;
        this.lungeFrame = null;
        // Player health in half hearts. This should always be a multiple of two
        this.maxHealth = 8;
        this.health = this.maxHealth;
        this.verticalSpeed = 40;
        this.maxSpeed = 30; // pixels/second
        // Inventory stuff
        this.numCoins = 0;
        this.numArrows = 0;
        this.armour = Item.Table.NONE;
        this.bow = Item.Table.NONE;
        this.sword = Item.Table.NONE;
        // Whether the user has free control over the player (set to false 
        // during a cutscene)
        //this.hasControl = true;
        this.dirx = 0;
        this.diry = 0;
        this.running = false;
        this.walkFPS = 10;
        // Process of dying (showing animation)
        this.dying = false;
        // Actually dead
        this.dead = false;
        this.lungeTimer = 0;
        // The number of kills (stored by monster name). Also stores the 
        // image of the monster (for displaying stats later)
        //     {count: ZZZ, img: ZZZ}
        this.kills = {};

        // Define the hitbox
        this.hitbox = new Hitbox(0, -2, 2, 2);

        this.setCharFrames(RES.FEMALE_MELEE, "melee1");
        /* Setup a PIXI container to hold the player sprite, and any other 
         * equipment they're carrying. */
        this.sprite = new PIXI.Container();
        // Setup the player sprite (texture comes later)
        this.spriteChar = new PIXI.Sprite();
        this.spriteChar.anchor.set(0.5, 1);
        this.sprite.addChild(this.spriteChar);
        // Setup the sprite for when the player is treading water
        this.waterSprite = Utils.createSplashSprite();
        this.waterSprite.y = -1.5;
        this.sprite.addChild(this.waterSprite);

        // Sprite for showing messages to the player
        this.textSprite = new PIXI.Sprite(renderText("?"));
        this.textSprite.scale.set(3/5.);
        this.textSprite.anchor.set(0.5, 1);
        this.textSprite.visible = false;
        this.sprite.addChild(this.textSprite);
        this.textTimeout = 0;

        // Minimum amount of time after taking damage, until the player can be
        // damaged again.
        this.damageCooldown = 0.5;
        // The timer used for tracking the cooldown
        this.damageTimer = 0;

        this.weaponSlot = null;

        this.track = null;
        this.nextTrack = null;

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

        this.handleCollisionCallback = (function(thing) {
            if (thing.handlePlayerCollision) {
                thing.handlePlayerCollision(this);
            }
        }).bind(this);
        //this.upgradeSword(Item.Table.SMALL_SWORD);
        this.upgradeBow(Item.Table.SMALL_BOW);
        this.numArrows = 99;
    }

    /* Have the player face the given direction */
    faceDirection(dirx)
    {
        this.sprite.scale.x = Math.abs(this.sprite.scale.x)*Math.sign(dirx);
        this.textSprite.scale.x = Math.abs(
            this.textSprite.scale.x)*Math.sign(dirx);
    }

    getFacing()
    {
        return Math.sign(this.sprite.scale.x);
    }

    /*update(dt)
      {
      var dirx = 0;
      var diry = 0;

      if (this.dead) return;

      if (this.textTimeout > 0) {
      this.textTimeout -= dt;
      if (this.textTimeout <= 0) {
      this.showMessage();
      }
      }

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

      // Handle attacking
      if (this.controls.primary.pressed) this.startAttack();
      if (!this.controls.primary.released) this.stopAttack();

      if (this.controls.swap.pressed) {
      this.swapWeapons();
      }

      if (this.knockedTimer <= 0) {
      dirx = this.controls.getX();
      diry = this.controls.getY();
      } else {
      this.velx = this.knocked;
      this.knockedTimer -= dt;
      }

      if (this.lungeTimer > 0) {
      this.lungeTimer -= dt;
      } else {
      if (dirx) {
      this.faceDirection(dirx);
      this.velx = dirx * this.maxSpeed;

      //if (this.controls.left.doublePressed || 
      //    this.controls.right.doublePressed)
      //{
      //    console.log("LUNGE!");
      //    this.velx *= 2;
      //    this.lungeTimer = 1;
      //}
      } else {
      this.velx *= 0.75;
      }
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

      //var speed = Math.sqrt(this.velx*this.velx + this.vely*this.vely);
      //if (speed > this.maxSpeed) {
      //this.velx *= this.maxSpeed/speed;
      //this.vely *= this.maxSpeed/speed;
      //}

      // Handle left/right movement
      var w = this.spriteChar.texture.width*0.75;
      if (this.velx) {
      var x = this.sprite.x + this.velx*dt;
      // Keep the player visible to the camera
      if (!this.level.checkSolidAt(x, this.sprite.y, w) &&
      x-w/2 >= this.level.camera.x && 
      x+w/2 <= this.level.camera.x + this.level.camera.width) {
      this.sprite.x = x;
      } else {
      this.velx = 0;
      }
      }
      // Handle up/down movement
      if (this.vely) {
      var y = this.sprite.y + this.vely*dt;
      if (!this.level.checkSolidAt(this.sprite.x, y, w)) {
      this.sprite.y = y;
      } else {
      this.vely = 0;
      }
      }

      // Update the equipped weapon
      if (this.weaponSlot && this.weaponSlot.update) {
      this.weaponSlot.update(dt);
      }

      // Make a splashy sound when we enter water
      var tile = this.level.getTileAt(this.sprite.x, this.sprite.y);
      if (tile.water) {
      if (!this.waterSprite.visible) 
      Audio.playSound(RES.SPLASH_SND);
      this.waterSprite.visible = true;
      } else {
      this.waterSprite.visible = false;
      }

      //if (controls.testKey && !controls.lastTestKey) this.health = 0;

      // Check for collisions with other things
      this.level.forEachThingHit(
      this.sprite.x, this.sprite.y, 
      this.hitbox, this, 
      this.handleCollisionCallback);

      // Update animation
      var frame = this.frames[((this.frame*10)|0) % this.frames.length];
      this.spriteChar.texture = frame;
      }*/

    update(dt)
    {
        let velx = 0;
        let vely = 0;

        if (this.running) {
            velx = this.maxSpeed;
        }
        
        // Handle attacking
        if (this.controls.primary.pressed) this.startAttack();
        if (!this.controls.primary.released) this.stopAttack();

        // Update the equipped weapon
        if (this.weaponSlot && this.weaponSlot.update) {
            this.weaponSlot.update(dt);
        }

        if (this.nextTrack)
        {
            // Player is in the process of moving to another track
            let dirY = Math.sign(this.nextTrack.y-this.sprite.y);
            vely = dirY*this.verticalSpeed;
        }
        else
        {
            // Check if the player wants to change tracks
            if (this.track && this.controls.getY() !== 0) {
                
                this.moveToTrack(this.level.getTrack(
                    this.track.number + Math.sign(this.controls.getY())
                ));
            }
        }

        if (this.damageTimer > 0)
        {
            this.damageTimer -= dt;
            if (this.damageTimer <= 0 || 
                this.damageCooldown-this.damageTimer > 0.1) 
            {
                // Stop flashing red
                this.spriteChar.tint = NO_TINT;
            }
        }

        if (velx !== 0 || vely !== 0)
        {
            this.frame += dt;
        }

        this.sprite.x += velx*dt;
        this.sprite.y += vely*dt;

        // If the player is changing tracks, check if they've made it
        if (this.nextTrack)
        {
            if (vely > 0 && this.sprite.y >= this.nextTrack.y ||
                vely < 0 && this.sprite.y <= this.nextTrack.y)
            {
                this.sprite.y = this.nextTrack.y;
                this.track = this.nextTrack;
                this.nextTrack = null;
            }
        }

        this.velx = velx;
        this.vely = vely;

        // Check for collisions with other things
        this.level.forEachThingHit(
            this.sprite.x, this.sprite.y, 
            this.hitbox, this, 
            this.handleCollisionCallback);

        // Update animation
        let frameNum = ((this.frame*this.walkFPS)|0) % this.frames.length;
        this.spriteChar.texture = this.frames[frameNum];
    }

    setCharFrames(res, name)
    {
        this.frames = Utils.getFrames(
            res, 
            [name + "_south_1", 
             name + "_south_2", 
             name + "_south_3"]);
        this.lungeFrame = Utils.getFrame(res, name + "_lunge_1");
        this.dyingFrames = Utils.getFrames(
            res, 
            ["melee1_dying_1", 
             "melee1_dying_2", 
             "melee1_dying_3"]);
    }

    setArmour(item)
    {
        // Change the player appearance based on their armour
        this.armour = item;
        this.updatePlayerAppearance();
    }

    updatePlayerAppearance()
    {
        // Update the player character sprite, based on the armour we're wearing
        var img = "melee1";
        if (this.armour === Item.Table.LEATHER_ARMOUR) img = "melee2";
        else if (this.armour == Item.Table.STEEL_ARMOUR) img = "melee3";
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

    upgradeSword(item)
    {
        // Switch over to the sword if we don't have a weapon equipped
        if (!this.weaponSlot) {
            this.weaponSlot = this.swordWeaponSlot;
        }
        this.sword = item;
        this.updatePlayerAppearance();
    }

    upgradeBow(item)
    {
        // Switch over to the bow if we don't have a weapon equipped
        if (!this.weaponSlot) {
            this.weaponSlot = this.bowWeaponSlot;
        }
        this.bow = item;
        this.updatePlayerAppearance();
    }

    upgradeArmour(item)
    {
        this.setArmour(item);
        Audio.playSound(RES.POWERUP2_SND);
    }

    healDamage(amt)
    {
        if (this.health < this.maxHealth) {
            this.health = Math.min(this.health+amt, this.maxHealth);
            Audio.playSound(RES.POWERUP4_SND, 1.25);
        }
    }

    takeDamage(amt, src)
    {
        if (this.damageTimer <= 0) 
        {
            // Adjust the damage parameters based on our armour
            var cooldown = this.damageCooldown;
            var knockedVel = 100;
            var knockedTimer = 0.1;

            if (this.armour === Item.Table.LEATHER_ARMOUR) {
                cooldown = this.damageCooldown*1.25;
                knockedVel = 90;
                knockedTimer = 0.08;
                if (Utils.randint(1, 4) === 1) {
                    if (amt > 1) amt--;
                }
            } else if (this.armour === Item.Table.STEEL_ARMOUR) {
                cooldown = this.damageCooldown*1.5;
                knockedVel = 80;
                knockedTimer = 0.05;
                if (Utils.randint(1, 2) === 1) {
                    amt--;
                }
            }

            Audio.playSound(RES.HIT_SND);

            // Take damage and have the player flash red for a moment
            this.health -= amt;
            this.damageTimer = this.damageCooldown;
            this.spriteChar.tint = DAMAGE_TINT;
            // Knock the player back a bit too
            this.knocked = knockedVel*Math.sign(this.sprite.x - src.sprite.x);
            this.knockedTimer = knockedTimer;
        }
    }

    swapWeapons()
    {
        if (this.weaponSlot === this.swordWeaponSlot && 
            this.bow !== Item.Table.NONE) 
        {
            this.weaponSlot = this.bowWeaponSlot;
            this.updatePlayerAppearance();
        } 
        else if (this.weaponSlot === this.bowWeaponSlot && 
                 this.sword !== Item.Table.NONE) 
        {
            this.weaponSlot = this.swordWeaponSlot;
            this.updatePlayerAppearance();
        }
    }

    startAttack()
    {
        if (this.weaponSlot)
            this.weaponSlot.startAttack();
    }

    stopAttack()
    {
        if (this.weaponSlot) 
            this.weaponSlot.stopAttack();
    }

    /* Called when a monster (thing) is killed by the player */
    handleMonsterKilled(monster)
    {
        if (this.kills[monster.name] === undefined) {
            this.kills[monster.name] = {count: 0, img: monster.frames[0]};
        }
        this.kills[monster.name].count++;
    }

    /* Called when the player walks over a takeable item (GroundItem). The item
     * is passed in here. (eg Item.Table.ZZZ) */
    handleTakeItem(item)
    {
        // Check for an armour upgrade
        if (item.isArmour() && item.isBetter(this.armour)) {
            this.upgradeArmour(item);
            return true;
        }
        // Check for a sword upgrade
        if (item.isSword() && item.isBetter(this.sword)) {
            if (this.sword === Item.Table.NONE) {
                if (this.controls.hasTouch) {
                    this.showMessage("TAP BUTTON", " TO ATTACK");
                } else {
                    this.showMessage("  PRESS A", "TO ATTACK");
                }
            }
            this.upgradeSword(item);
            return true;
        }
        // Check for a bow upgrade
        if (item.isBow() && item.isBetter(this.bow)) {
            if (this.bow === Item.Table.NONE) {
                if (this.controls.hasTouch) {
                    this.showMessage("SWIPE BUTTON", "    TO SWAP");
                } else {
                    this.showMessage("PRESS X", "TO SWAP");
                }
            }
            this.upgradeBow(item);
            return true;
        }
        // Consumable items
        switch (item) {
        case Item.Table.ARROW:
            this.numArrows += 5;
            break;

        case Item.Table.COIN:
            this.numCoins++;
            break;

        case Item.Table.SMALL_HEALTH:
            this.healDamage(2);
            break;

        case Item.Table.LARGE_HEALTH:
            this.healDamage(this.maxHealth);
            break;
        }
        Audio.playSound(RES.COIN_SND);
        return true;
    }

    showMessage()
    {
        var lines = Array.prototype.slice.call(arguments);
        if (lines.length > 0) {
            this.textSprite.y = -this.spriteChar.texture.height-1;
            this.textSprite.texture = renderText(lines, {blackBG: true})
            this.textSprite.visible = true;
            this.textTimeout = 3;
        } else {
            this.textSprite.visible = false;
        }
    }

    /* Start the player moving onto the given track. Returns true if the player can
     * move onto the track, and false otherwise. */
    moveToTrack(track)
    {
        if (!track) {
            return false;
        }
        if (track.checkSolidAt(this.sprite.x, this.sprite.width)) {
            return false;
        }
        this.nextTrack = track;    
        return true;
    }

    isMovingToTrack() {
        return this.nextTrack !== null;
    }

}
