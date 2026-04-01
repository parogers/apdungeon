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

import { renderText } from './ui';
import { Resources, ANIM, RES } from './res';
import { Utils } from './utils';
import { Item } from './item';
import { Animation, Thing, Hitbox } from './thing';
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
const STATE_MOVING_TO = 2;
const STATE_ATTACKING = 3;
const STATE_MOVE_TO_ATTACK = 4;

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


class GameControlsFSM {
    constructor(player) {
        this.player = player;
        this.state = STATE_IDLE;
        this.target = null;
        this.moveTo = null;
        this.autoAttack = false;
    }

    get weaponSlot() {
        return this.player.weaponSlot;
    }

    get controls() {
        return this.player.controls;
    }

    get level() {
        return this.player.level;
    }

    update(dt)
    {
        if (this.controls.primary.pressed) {
            this.autoAttack = !this.autoAttack;
            if (!this.autoAttack) {
                this.state = STATE_IDLE;
                this.player.velx = 0;
                this.player.vely = 0;
            }
        }
        if (this.state === STATE_IDLE) {
            if (this.autoAttack) {
                const things = this.level.things.filter(thing => !!thing.health && !thing.dead && thing.handleHit && thing !== this).sort((t1, t2) => {
                    const d1 = this.player.getDistanceTo(t1);
                    const d2 = this.player.getDistanceTo(t2);
                    return d1-d2;
                });
                if (things.length) {
                    this.target = things[0];
                    this.state = STATE_ATTACKING;
                }
            }
            if (this.controls.mouse.pressed) {
                const { x, y } = this.level.getMousePos();
                const hit = this.level.getThingAt(x, y, (thing) =>
                    thing !== this && !thing.dead && thing.handleHit
                );
                if (hit) {
                    this.target = hit;
                    this.state = STATE_ATTACKING;
                } else {
                    this.moveTo = new PIXI.Point(x, y);
                    this.state = STATE_MOVING_TO;
                }
            }
        } else if (this.state === STATE_MOVING_TO) {
            if (this.controls.mouse.held) {
                const { x, y } = this.level.getMousePos();
                this.moveTo.x = x;
                this.moveTo.y = y;
            }
            const dist = this.moveTo.subtract(this.player.position);
            if (dist.magnitude() > 1) {
                const vel = dist.normalize().multiplyScalar(this.player.maxSpeed);
                this.player.velx = vel.x;
                this.player.vely = vel.y;
            } else {
                this.state = STATE_IDLE;
                this.player.velx = 0;
                this.player.vely = 0;
            }
        } else if (this.state === STATE_ATTACKING) {
            if (this.target.dead) {
                this.state = STATE_IDLE;
                this.target = null;
                this.player.velx = 0;
                this.player.vely = 0;
            } else if (this.controls.mouse.pressed) {
                const { x, y } = this.level.getMousePos();
                this.moveTo = new PIXI.Point(x, y);
                this.state = STATE_MOVING_TO;
            } else {
                this.moveTo = new PIXI.Point(this.target.x, this.target.y);
                const dist = this.moveTo.subtract(this.player.position);
                if (dist.magnitude() >= this.weaponSlot.reach) {
                    const speed = Math.min(
                        100*(dist.magnitude() - this.player.weaponSlot.reach),
                        this.player.maxSpeed
                    );
                    const vel = dist.normalize().multiplyScalar(speed);
                    this.player.velx = vel.x;
                    this.player.vely = vel.y;
                } else {
                    this.player.velx *= 0.9;
                    this.player.vely *= 0.9;
                    this.player.faceDirection(
                        this.target.x - this.player.x,
                        this.target.y - this.player.y
                    );
                    this.weaponSlot.startAttack(this.target);
                }
            }
        }
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
        this.knockedTimer = 0;
        this.fsm = new GameControlsFSM(this);
        // The "nominal" X-pos of the player within the level. The player
        // may stray from this position (eg when jumping) but generally
        // will tend back to it. This is also the position that is tracked
        // by the camera.
        this.basePos = 0;
        this.baseSpeed = 0;
        this.velx = 0;
        this.vely = 0;
        this.velh = 0;
        this.accelx = 0;
        this.accely = 0;
        this.accelh = 0;
        // Player health in half hearts. This should always be a multiple of two
        this.maxHealth = 8;
        this.health = this.maxHealth;
        this.maxSpeed = 50; // pixels/second
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
        this.facingSouth = true;

        // Define the hitbox
        this.hitbox = new Hitbox(0, -2, 2, 2);

        this.setCharFrames('player1');
        // Setup the player sprite (texture comes later)
        this.spriteChar = new PIXI.Sprite();
        this.spriteChar.zIndex = 0;
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
        this.upgradeSword(Item.Table.SMALL_SWORD);
        this.upgradeBow(Item.Table.SMALL_BOW);
        this.numArrows = 99;

        // const mask = new PIXI.Graphics().rect(
        //     -this.width/2,
        //     -this.height,
        //     this.width,
        //     this.height*0.75
        // ).fill();
        // this.spriteChar.mask = mask;
        // this.spriteChar.addChild(mask);
    }

    get width() {
        // return Math.abs(this.spriteChar.width);
        return this.walkAnim.texture.width;
    }

    get height() {
        // return Math.abs(this.spriteChar.height);
        return this.walkAnim.texture.height;
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

    faceDirection(x, y) {
        this.facing = Math.sign(x) || this.facing;
        this.facingSouth = y >= 0;
    }

    update(dt) {
        this.updateFree(dt);
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
    }

    updateFree(dt)
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
        // if (this.dying) {
        //     this.frame += 2.5*dt;
        //     if (this.frame > this.dyingFrames.length-1) {
        //         this.frame = this.dyingFrames.length-1;
        //         this.dead = true;
        //     }
        //     let frame = this.dyingFrames[(this.frame)|0];
        //     this.spriteChar.texture = frame;
        //     return;
        // }

        // Check if the player has just died
        if (this.health <= 0) {
            this.dying = true;
            this.frame = 0;
            this.weaponSlot = null;
            this.updatePlayerAppearance();
            this.spriteChar.tint = NO_TINT;
            this.dead = true;
            return;
        }
        this.fsm.update(dt);

        if (this.controls.swap.pressed) {
            this.swapWeapons();
        }

        if (this.knockedTimer > 0) {
            this.knockedTimer -= dt;
        }

        if (this.velx || this.vely) {
            const w = this.spriteChar.texture.width*0.75;
            const x = this.x + this.velx*dt;
            const y = this.y + this.vely*dt;
            if (!this.level.checkSolidAt(x, this.y, w)) {
                this.x = x;
            } else {
                this.velx = 0;
            }
            if (!this.level.checkSolidAt(this.x, y, w)) {
                this.y = y;
            } else {
                this.vely = 0;
            }
            this.faceDirection(this.velx || this.facing, this.vely || (
                this.facingSouth ? 1 : -1
            ));
        }
        this.weaponSlot.facingSouth = this.facingSouth;

        // Update the equipped weapon
        if (this.weaponSlot && this.weaponSlot.update) {
            this.weaponSlot.update(dt);
        }

        this.level.forEachThingHit(
            this.sprite.x, this.sprite.y,
            this.hitbox, this,
            this.handleCollisionCallback
        );

        if (this.controls.space.pressed && this.fh === 0) {
            this.velh = 50;
        }
        if (this.velh) {
            this.fh += this.velh*dt;
            this.velh -= 300*dt;
            if (this.fh <= 0) {
                this.fh = 0;
                this.velh = 0;
            }
        }
        if (Math.abs(this.velx) < 0.1) this.velx = 0;
        if (Math.abs(this.vely) < 0.1) this.vely = 0;
        if (this.velx || this.vely) {
            this.spriteChar.texture = this.walkAnim.update(dt);
        } else {
            this.spriteChar.texture = this.walkAnim.frames[0];
        }
    }

    get walkAnim() {
        if (this.facingSouth) {
            return this.walkSouthAnim;
        }
        return this.walkNorthAnim;
    }

    setCharFrames(base)
    {
        this.walkNorthAnim = new Animation(ANIM.PLAYER1_NORTH_WALK);
        this.walkSouthAnim = new Animation(ANIM.PLAYER1_SOUTH_WALK);
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
}
