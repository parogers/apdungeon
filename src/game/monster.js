
import * as PIXI from 'pixi.js';

import { Level } from './level';
import { Thing, Creature, Animation } from './thing';
import { GroundItem } from './grounditem';
import { Blood } from './blood';
import { Audio } from './audio';
import { RES } from './res';
import { Utils } from './utils';

/***********/
/* Monster */
/***********/

export class Monster extends Creature {
    constructor() {
        super();
        this.timer = 0;
        this.velx = 0;
        this.vely = 0;
        this.velh = 0;
        this.touchDamage = 1;
        this.bodySprite = new PIXI.Sprite()
        this.sprite.addChild(this.bodySprite);
        this.knockedTimer = 0;
        this.knocked = 0;
        this.attackFrame = null;
        this.onGround = true;
        this.hitbox = new PIXI.Rectangle(0, 0, 4, 4);
    }

    get stunned() {
        return this.knockedTimer > 0;
    }

    update(dt) {
        if (this.dead) {
            return;
        }
        if (this.knockedTimer > 0) {
            this.velx = this.knocked;
            this.knockedTimer -= dt;
        }
        this.fx += this.velx*dt;
        this.fy += this.vely*dt;
        this.fh += this.velh*dt;
        if (this.onGround) {
            this.fh = this.level.getHeightAt(this.x, this.y);
        }
    }

    handleHit(souceThing, dmg) {
        if (this.dead) {
            return false;
        }
        this.health -= dmg;
        if (this.dead) {
            Audio.playSound(RES.DEAD_SND);
            this.level.addThing(new DeathAnimation(this));
            this.handleTreasureDrop();
            return true;
        }
        Audio.playSound(RES.SNAKE_HURT_SND);
        this.knocked = Math.sign(this.x - souceThing.x)*60;
        this.knockedTimer = 0.1;
        this.state = this.STATE_HURT;

        this.level.addThing(
            new Blood(),
            this.x + Utils.randint(-2, 2),
            this.y + Utils.randint(-4, 0)
        );
        return true;
    }

    handlePlayerCollision(player) {
        // if (this.dead) {
        //     return;
        // }
        // player.takeDamage(this.touchDamage, this);
    }

    handleTreasureDrop()
    {
        // Pick an item entry from the table, using a weighted probability pick
        // Entries look like: [item_number, weight]. First sum all the weights
        // and pick a random number up to that total.
        let total = 0;
        const table = this.getDropTable();
        for (let entry of table) {
            total += entry[1];
        }
        // Pick a random number, then iterate over the items and find what
        // item it corresponds to.
        let pick = null;
        let num = Utils.randint(0, total);
        for (let entry of table) {
            num -= entry[1];
            if (num <= 0) {
                pick = entry[0];
                break;
            }
        }
        // Drop the item
        if (pick === null) {
            return;
        }

        if (!Array.isArray(pick)) {
            pick = [pick];
        }
        for (let item of pick) {
            const dx = Utils.randint(-5, 5);
            const dy = Utils.randint(-5, 5);
            let gnd = new GroundItem(
                item,
                this.x,
                this.y,
                this.fh
            );
            gnd.velh = Utils.randint(50, 75);
            gnd.velx = dx;
            gnd.vely = dy;
            this.level.addThing(gnd);
        }
    }

    getDropTable() {
        return [];
    }
}


// Animates a monster falling off the screen as a death animation
export class DeathAnimation extends Thing
{
    constructor(monster)
    {
        super();
        this.STATE_FLIP = 0;
        this.STATE_FALLING = 1;

        monster.zpos = Level.ON_FLOOR_POS;
        monster.sprite.tint = 0x808080;
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
            this.removeSelf();
            // // Have the monster 'fall off' the screen and disappear
            // this.vely += this.accely*dt;
            // this.monster.x += this.level.player.baseSpeed*1.5*dt;
            // this.monster.y += this.vely*dt;
            //
            // if (!this.level.isThingVisible(this.monster))
            // {
            //     this.monster.removeSelf();
            //     this.removeSelf();
            // }
        }
    }
}
