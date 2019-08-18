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
import { ANIM, RES } from './res';
import { Utils } from './utils';
import { Item } from './item';
import { Animation, TrackMover, Thing, Hitbox } from './thing';
import { Flame, Splash, Shadow } from './effects';
import { BowWeaponSlot, SwordWeaponSlot } from './weaponslot';
import { Audio } from './audio';

// What tint of colour to use when the player takes damage
const DAMAGE_TINT = 0xFF0000;
const NO_TINT = 0xFFFFFF;

// Vertical acceleration when jumping
const JUMP_ACCEL = -1000;
// How fast the player accelerates while running
const RUNNING_ACCEL = 500;

const STATE_IDLE = 1;
const STATE_CHANGING_TRACK = 2;
const STATE_KNOCKED_BACK = 3;

/* Tracks something taking damage. It tracks how long to flash the sprite 
 * red and the damage cooldown time. */
class DamageTimer
{
    constructor(sprite)
    {
        this.sprite = sprite;
        // How long to flash the sprite red
        this.flashTimeout = 0.1;
        // How long we should be immune to damage after taking some
        // (ie damage cooldown)
        this.damageTimeout = 0.5;
        // The timers for the above timeouts
        this.flashTimer = 0;
        this.damageTimer = 0;
    }

    get expired() {
        return (this.damageTimer <= 0 && this.flashTimer <= 0);
    }

    start()
    {
        this.damageTimer = this.damageTimeout;
        this.flashTimer = this.flashTimeout;
    }

    // Returns true/false if the timer has expired
    update(dt)
    {
        if (this.expired) {
            return true;
        }
        // Flash the red for a bit
        if (this.flashTimer > 0)
        {
            this.flashTimer -= dt;
            if (this.flashTimer <= 0) {
                this.sprite.tint = NO_TINT;
            } else {
                this.sprite.tint = DAMAGE_TINT;
            }
        }
        this.damageTimer -= dt;
        return this.expired;
    }
}

export class Player extends Thing
{
    constructor(controls)
    {
        super();
        this.name = 'player';
        this.controls = controls;
        this.state = STATE_IDLE;
        this.trackMover = null;
        // The "nominal" X-pos of the player within the level. The player
        // may stray from this position (eg when jumping) but generally
        // will tend back to it. This is also the position that is tracked
        // by the camera.
        this.basePos = 0;
        this.baseSpeed = 0;
        this.velx = 0;
        this.vely = 0;
        this.accelx = 0;
        this.accely = 0;
        // Player health in half hearts. This should always be a multiple of two
        this.maxHealth = 8;
        this.health = this.maxHealth;
        this.maxSpeed = 30; // pixels/second
        // Inventory stuff
        this.numCoins = 0;
        this.numArrows = 0;
        this.armour = Item.Table.NONE;
        this.bow = Item.Table.NONE;
        this.sword = Item.Table.NONE;
        this.running = false;
        // Process of dying (showing animation)
        this.dead = false;
        // The number of kills (stored by monster name). Also stores the 
        // image of the monster (for displaying stats later)
        //     {count: ZZZ, img: ZZZ}
        this.kills = {};

        // Define the hitbox
        this.hitbox = new Hitbox(0, -2, 2, 2);

        this.setCharFrames('player1');
        // Setup the player sprite (texture comes later)
        this.spriteChar = new PIXI.Sprite();
        this.spriteChar.anchor.set(0.5, 1);
        this.sprite.addChild(this.spriteChar);

        // Sprite for showing messages to the player
        this.textSprite = new PIXI.Sprite(renderText('?'));
        this.textSprite.scale.set(3/5.);
        this.textSprite.anchor.set(0.5, 1);
        this.textSprite.visible = false;
        this.sprite.addChild(this.textSprite);
        this.textTimeout = 0;

        // Setup the sprite for when the player is treading water
        this.splash = new Splash(this, -1.5, true);
        this.shadow = new Shadow(this, Shadow.MEDIUM);
        this.flame = new Flame(this, Flame.SMALL);

        // Timer for regular damage
        this.damageTimer = new DamageTimer(this.spriteChar);
        // Timer for fire based damage (eg running through lava) This is a
        // separate timer because we don't want the player to be able to hide
        // from a larger source of damage (ie boss) by hiding in lava.
        this.fireDamageTimer = new DamageTimer(this.spriteChar);

        this.weaponSlot = null;

        // Weapon slots are used to manage the weapon sprite. (ie attack and
        // running animations, etc) We add both slot sprites to the player
        // sprite, then use the 'visible' flag to control which is rendered.
        this.bowWeaponSlot = new BowWeaponSlot(this);
        this.swordWeaponSlot = new SwordWeaponSlot(this);
        this.sprite.addChild(this.bowWeaponSlot.sprite);
        this.sprite.addChild(this.swordWeaponSlot.sprite);
        this.bowWeaponSlot.sprite.visible = false;
        this.swordWeaponSlot.sprite.visible = false;

        this.handleCollisionCallback = (thing) => {
            if (thing.handlePlayerCollision) {
                thing.handlePlayerCollision(this);
            }
        };
        //this.upgradeSword(Item.Table.SMALL_SWORD);
        this.upgradeBow(Item.Table.SMALL_BOW);
        this.numArrows = 99;
    }

    get width() {
        return Math.abs(this.spriteChar.width);
    }

    get height() {
        return Math.abs(this.spriteChar.height);
    }

    get facing()
    {
        return Math.sign(this.sprite.scale.x);
    }

    set facing(value)
    {
        let dirx = Math.sign(value);
        this.sprite.scale.x = Math.abs(this.sprite.scale.x)*dirx;
        this.textSprite.scale.x = Math.abs(this.textSprite.scale.x)*dirx;
    }

    get inWater() {
        return this.splash.visible;
    }

    set inWater(value) {
        this.splash.visible = value;
    }

    /*update(dt)
      {
      let dirx = 0;
      let diry = 0;

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
      let frame = this.dyingFrames[(this.frame)|0];
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
      //    console.log('LUNGE!');
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

      //let speed = Math.sqrt(this.velx*this.velx + this.vely*this.vely);
      //if (speed > this.maxSpeed) {
      //this.velx *= this.maxSpeed/speed;
      //this.vely *= this.maxSpeed/speed;
      //}

      // Handle left/right movement
      let w = this.spriteChar.texture.width*0.75;
      if (this.velx) {
      let x = this.sprite.x + this.velx*dt;
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
      let y = this.sprite.y + this.vely*dt;
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
      let tile = this.level.getTileAt(this.sprite.x, this.sprite.y);
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
      let frame = this.frames[((this.frame*10)|0) % this.frames.length];
      this.spriteChar.texture = frame;
      }*/

    update(dt)
    {
        if (this.running)
        {
            // Accelerate up to the maximum running speed
            // TODO - clean up baseSpeed/basePos stuff (what if the baseSpeed is
            // set below but runnning is false)
            this.baseSpeed = Math.min(
                this.baseSpeed + RUNNING_ACCEL*dt,
                this.maxSpeed
            );
            this.basePos += this.baseSpeed*dt;
        }
        else
        {
            this.baseSpeed = 0;
        }

        if (this.state === STATE_IDLE)
        {
            if (this.controls.primary.pressed ||
                (this.controls.gesture && this.controls.gesture.tap))
            {
                this.startAttack();
            }

            // Update the equipped weapon
            if (this.weaponSlot && this.weaponSlot.update) {
                this.weaponSlot.update(dt);
            }

            if (this.track &&
                this.controls.gesture &&
                this.controls.gesture.isVerticalLine)
            {
                let diry = Math.sign(this.controls.gesture.dy);
                let nextTrack = this.level.getTrack(this.track.number + diry);

                this.startMoveToTrack(nextTrack);
            }
            else if (this.track && this.controls.getY() != 0)
            {
                let diry = Math.sign(this.controls.getY());
                let nextTrack = this.level.getTrack(this.track.number + diry);

                this.startMoveToTrack(nextTrack);
            }

            if (this.running)
            {
                this.sprite.x += this.maxSpeed*dt;
                this.walkAnim.update(dt);

                // Check for a collision with a wall
                let checkPos = this.fx + this.level.tileWidth/2;
                let tile = this.level.getTileAt(checkPos, this.fy);

                if (tile && tile.solid && checkPos < this.level.getWidth())
                {
                    // The player collided with a wall
                    this.state = STATE_KNOCKED_BACK;
                    this.running = false;
                    this.velx = -1.5*this.baseSpeed;
                    this.takeDamage(1, 'wall');
                }
            }

            this.fx = this.basePos;

            // Check for collisions with other things
            this.level.forEachThingHit(
                this.sprite.x,
                this.sprite.y, 
                this.hitbox,
                this,
                this.handleCollisionCallback
            );
        }
        else if (this.state === STATE_CHANGING_TRACK)
        {
            if (this.running)
            {
                this.fx = this.basePos;
            }
            if (this.trackMover.update(dt))
            {
                this.trackMover = null;
                this.vely = 0;
                this.state = STATE_IDLE;
            }
        }
        else if (this.state === STATE_KNOCKED_BACK)
        {
            this.updateKnockedBack(dt);
        }

        this.damageTimer.update(dt);

        // Update shadow and splash components
        this.shadow.update(dt);
        this.flame.update(dt);
        this.splash.update(dt);
        this.shadow.visible = !this.splash.visible && !this.flame.visible;

        if (this.flame.visible)
        {
            // We're currently on fire
            this.takeDamage(1, 'fire');
        }
        this.fireDamageTimer.update(dt);
        this.spriteChar.texture = this.walkAnim.texture;
    }

    // The player is being knocked back after hitting a wall
    updateKnockedBack(dt)
    {
        function findTrack(level, xpos)
        {
            // Find a track that's not blocked
            // TODO - prefer tracks that are safe to land on (eg no lava)
            let x = xpos + level.tileWidth;
            let w = level.tileWidth;
            for (let track of level.tracks)
            {
                if (!track.checkSolidAt(x, w)) {
                    return track;
                }
            }
            return null;
        }
        this.velx -= this.velx*dt*8;
        this.baseSpeed = this.velx;
        this.basePos += this.velx*dt;
        this.fx = this.basePos;
        if (Math.abs(this.velx) <= 5)
        {
            let track = findTrack(this.level, this.fx);
            this.running = true;
            this.startMoveToTrack(track);
        }
    }

    setCharFrames(base)
    {
        this.walkAnim = new Animation(ANIM[base.toUpperCase() + '_WALK']);
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
        let base = 'player1';
        if (this.armour === Item.Table.LEATHER_ARMOUR) base = 'player1';
        else if (this.armour == Item.Table.STEEL_ARMOUR) base = 'player1';
        this.setCharFrames(base);
        // Update the sword sprite
        // ...
        // Update the bow sprite
        // ...
        let b = (this.weaponSlot === this.bowWeaponSlot);
        this.bowWeaponSlot.sprite.visible = b;

        b = (this.weaponSlot === this.swordWeaponSlot);
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
        if (src === 'fire')
        {
            if (this.fireDamageTimer.expired)
            {
                this.health -= amt;
                this.fireDamageTimer.start();
                Audio.playSound(RES.HIT_SND);
            }
        }
        else if (this.damageTimer.expired)
        {
            // Adjust the damage parameters based on our armour
            let timeout = this.damageTimeout;

            /*
            if (this.armour === Item.Table.LEATHER_ARMOUR) {
                timeout = this.damageTimeout*1.25;
                if (Utils.randint(1, 4) === 1) {
                    if (amt > 1) amt--;
                }
            } else if (this.armour === Item.Table.STEEL_ARMOUR) {
                timeout = this.damageTimeout*1.5;
                if (Utils.randint(1, 2) === 1) {
                    amt--;
                }
            }*/

            Audio.playSound(RES.HIT_SND);

            // Take damage and have the player flash red for a moment
            this.health -= amt;
            this.damageTimer.start();
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
        /*if (this.kills[monster.name] === undefined) {
            this.kills[monster.name] = {count: 0, img: monster.frames[0]};
        }
        this.kills[monster.name].count++;*/
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
                    this.showMessage('TAP BUTTON', ' TO ATTACK');
                } else {
                    this.showMessage('  PRESS A', 'TO ATTACK');
                }
            }
            this.upgradeSword(item);
            return true;
        }
        // Check for a bow upgrade
        if (item.isBow() && item.isBetter(this.bow)) {
            if (this.bow === Item.Table.NONE) {
                if (this.controls.hasTouch) {
                    this.showMessage('SWIPE BUTTON', '    TO SWAP');
                } else {
                    this.showMessage('PRESS X', 'TO SWAP');
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
        let lines = Array.prototype.slice.call(arguments);
        if (lines.length > 0) {
            this.textSprite.y = -this.height-1;
            this.textSprite.texture = renderText(lines, {blackBG: true})
            this.textSprite.visible = true;
            this.textTimeout = 3;
        } else {
            this.textSprite.visible = false;
        }
    }

    /* Start the player moving onto the given track. Returns true if the player 
     * can move onto the track, and false otherwise. */
    startMoveToTrack(track)
    {
        if (this.state !== STATE_IDLE && this.state !== STATE_KNOCKED_BACK) {
            return false;
        }
        if (!track) {
            return false;
        }
        if (track.checkSolidAt(this.fx, this.width)) {
            return false;
        }
        // Note: we have the player jump unless they're currently in water
        this.state = STATE_CHANGING_TRACK;
        this.trackMover = new TrackMover(
            this,
            track,
            1.5*this.maxSpeed,
            this.inWater ? 0 : JUMP_ACCEL,
        );
        return true;
    }

    isMovingToTrack() {
        return this.trackMover !== null;
    }
}
