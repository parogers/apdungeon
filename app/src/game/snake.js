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

import { RES, ANIM } from './res';
import { Utils } from './utils';
import { Animation, Thing, Hitbox } from './thing';
import { Splash, Shadow } from './effects';
import { Item } from './item';
import { Audio } from './audio';

// Animates a monster falling off the screen as a death animation
export class DeathAnimation extends Thing
{
    constructor(monster)
    {
        super();
        this.STATE_FLIP = 0;
        this.STATE_FALLING = 1;

        this.monster = monster;
        this.accely = 100;
        this.vely = 0;
        this.state = this.STATE_FLIP;
    }

    update(dt)
    {
        if (this.state === this.STATE_FLIP)
        {
            if (this.monster.shadow) {
                this.monster.shadow.remove();
            }
            if (this.monster.splash) {
                this.monster.splash.remove();
            }
            this.monster.sprite.y -= 3; // TODO - magic number
            this.monster.sprite.scale.y = -1;
            this.state = this.STATE_FALLING;
        }
        else if (this.state === this.STATE_FALLING)
        {
            // Have the monster "fall off" the screen and disappear
            this.vely += this.accely*dt;
            this.monster.sprite.x += this.level.player.baseSpeed*1.5*dt;
            this.monster.sprite.y += this.vely*dt;

            if (!this.level.isThingVisible(this.monster))
            {
                this.monster.removeSelf();
                this.removeSelf();
            }
        }
    }
}

/*********/
/* Snake */
/*********/

export class Snake extends Thing
{
    constructor()
    {
        super();
        this.STATE_PACING = 0;
        this.STATE_IDLE = 1;
        this.STATE_FORWARD = 2;
        this.STATE_HURT = 3;
        this.STATE_DEAD = 4;

        this.name = "Snake";
        this.anim = new Animation(ANIM.SNAKE_WALK);
        this.speed = 16;
        this.health = 3;
        this.facing = 1;
        // The actual snake sprite
        this.snakeSprite = new PIXI.Sprite(this.anim.texture);
        this.snakeSprite.anchor.set(0.5, 7/8);
        this.sprite.addChild(this.snakeSprite);
        this.shadow = new Shadow(this, this.shadowType);
        this.splash = new Splash(this, this.splashOffset, false);
        this.knocked = 0;
        this.knockedTimer = 0;
        this.state = this.STATE_PACING;
        this.hitbox = new Hitbox(0, -1, 6, 4);
        this.timer = 0;
        this.velx = 0;
    }

    get shadowType() {
        return Shadow.MEDIUM;
    }

    get splashOffset() {
        return -1;
    }

    get width() {
        return Math.abs(this.snakeSprite.width);
    }

    get height() {
        return Math.abs(this.snakeSprite.height);
    }

    getDropTable() 
    {
        return [[Item.Table.COIN, 2],
                [Item.Table.ARROW, 1],
                [Item.Table.SMALL_HEALTH, 1]];
    }

    update(dt)
    {
        if (this.state === this.STATE_PACING)
        {
            // Pacing back and forth
            this.timer -= dt;
            if (this.timer <= 0) {
                this.timer = 0.5;
                this.facing = -this.facing;
            }
            this.velx = this.speed*this.facing;
        }
        else if (this.state === this.STATE_IDLE)
        {
        }
        else if (this.state === this.STATE_FORWARD)
        {
            // Marching forward if the player is close enough
            if (this.level.isThingVisible(this)) {
                this.velx = -this.speed;
                this.facing = -1;
            }
        }
        else if (this.state === this.STATE_HURT)
        {
            // The snake keeps its eyes closed while hurt
            //this.snakeSprite.texture = this.frames[1];
            // Slide backwards from the hit
            if (this.knockedTimer > 0) {
                let dx = this.knocked*dt;
                let tile = this.level.getTileAt(this.sprite.x+dx, this.sprite.y);
                if (!tile.solid) {
                    this.sprite.x += dx;
                }
                this.knockedTimer -= dt;
            } else {
                // Resume/start attacking
                this.state = this.STATE_FORWARD;
            }
        }
        else if (this.state === this.STATE_DEAD)
        {
            this.velx = 0;
        }

        this.splash.update(dt);
        this.shadow.update(dt);
        this.shadow.visible = !this.splash.visible;

        if (this.velx != 0)
        {
            this.sprite.x += this.velx*dt;
            this.snakeSprite.texture = this.anim.update(dt);
        }
        this.sprite.scale.x = this.facing*Math.abs(this.sprite.scale.x);
    }

    handleHit(srcx, srcy, dmg)
    {
        let player = this.level.player;
        if (this.state === this.STATE_DEAD) return false;
        this.health -= 1;
        if (this.health <= 0) {
            // Dead
            Audio.playSound(RES.DEAD_SND);
            this.state = this.STATE_DEAD;
            // Drop a reward
            this.level.handleTreasureDrop(
                this.getDropTable(), this.sprite.x, this.sprite.y);
            player.handleMonsterKilled(this);

            // Show the death animation
            this.level.addThing(new DeathAnimation(this));

        } else {
            // Damaged and knocked back
            Audio.playSound(RES.SNAKE_HURT_SND);
            this.knocked = Math.sign(this.sprite.x-srcx)*60;
            this.knockedTimer = 0.1;
            this.state = this.STATE_HURT;
        }

        // Add some random blood, but only if we're not currently in water
        let tile = this.level.getTileAt(this.sprite.x, this.sprite.y);
        if (!tile.water) {
            this.level.createBloodSpatter(this.sprite.x, this.sprite.y-1);
        }
        return true;
    }

    handlePlayerCollision(player)
    {
        player.takeDamage(1, this);
    }
}


/* Other snake-like things */

/*******/
/* Rat */
/*******/

export class Rat extends Snake
{
    constructor() 
    {
        super();
        this.name = "Rat";
        this.anim = new Animation(ANIM.RAT_WALK);
        this.health = -1;
        this.speed = 20;
        this.frame = 0;
        this.facing = -1;
        this.knocked = 0;
        this.knockedTimer = 0;
        this.state = this.STATE_FORWARD;
        this.snakeSprite.texture = this.anim.texture;
    }

    get shadowType() {
        return Shadow.THIN;
    }

    get splashOffset() {
        return -0.5;
    }
}

/************/
/* Scorpion */
/************/

export class Scorpion extends Snake
{
    constructor()
    {
        super();
        this.name = "Scorpion";
        this.anim = new Animation(ANIM.SCORPION_WALK);
        this.health = 4;
        this.speed = 10;
        this.frame = 0;
        this.facing = -1;
        this.knocked = 0;
        this.knockedTimer = 0;
        this.state = this.STATE_FORWARD;
        this.snakeSprite.texture = this.anim.texture;
        this.snakeSprite.anchor.set(0.5, 1);
    }
}
