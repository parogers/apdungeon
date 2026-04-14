
import * as PIXI from 'pixi.js';
import { ANIM, RES, Resources } from './res';
import { Animation } from './thing';
import { Item } from './item';
import { Monster } from './monster';
import { Shadow } from './effects';


const STATE = {
    IDLE: 0,
    FOLLOWING: 1,
    ATTACKING: 2,
};


/************/
/* Scorpion */
/************/

export class Scorpion extends Monster
{
    constructor()
    {
        super();
        this.name = 'Scorpion';
        this.health = 4;
        this.speed = 10;
        this.facing = -1;
        this.meleeDamage = 1;
        this.moveAnim = new Animation(ANIM.SCORPION_WALK);
        this.idleAnim = new Animation(ANIM.SCORPION_IDLE);
        this.bodySprite.anchor.set(0.5, 1);
        this.attackFrame = Resources.shared.getFrame('enemy-scorpion-attack');
        this.state = STATE.IDLE;
        this.meleeAttackRange = 4;
        this.target = null;
        this.shadow = new Shadow(this);
    }

    update(dt) {
        if (this.dead) {
            return;
        }
        // this.bodySprite.texture = this.moveAnim.update(dt);
        // return;
        if (this.stunned) {
            this.state = STATE.FOLLOWING;
            super.update(dt);
            return;
        }
        if (this.state === STATE.IDLE) {
            if (this.timer <= 0) {
                this.timer = 2;
                this.facing *= -1;
            }
            this.timer -= dt;
            this.velx = this.facing*this.speed;
            this.bodySprite.texture = this.moveAnim.update(dt);
        } else if (this.state === STATE.FOLLOWING) {
            if (this.timer > 0) {
                this.timer -= dt;
                this.bodySprite.texture = this.idleAnim.update(dt);
                return;
            }
            const dist = this.target.position.subtract(this.position);
            if (dist.magnitude() > 10*this.meleeAttackRange) {
                this.state = STATE.IDLE;
            } else if (dist.magnitude() > this.meleeAttackRange) {
                const vel = dist.normalize().multiplyScalar(20);
                this.velx = vel.x;
                this.vely = vel.y;
            } else {
                this.velx = 0;
                this.vely = 0;
                this.state = STATE.ATTACK;
                this.timer = 1;
                this.target.takeDamage(this.meleeDamage, this);
            }
            this.faceThing(this.level.player);
            if (this.velx || this.vely) {
                this.bodySprite.texture = this.moveAnim.update(dt);
            } else {
                this.bodySprite.texture = this.idleAnim.update(dt);
            }
        } else if (this.state === STATE.ATTACK) {
            this.bodySprite.texture = this.attackFrame;
            this.timer -= dt;
            if (this.timer <= 0) {
                this.state = STATE.FOLLOWING;
                this.timer = 1;
            }
        }
        this.shadow.update();
        super.update(dt);
    }

    getDropTable()
    {
        return [
            [[Item.Table.COIN, Item.Table.COIN, Item.Table.COIN, Item.Table.COIN], 2],
            [[Item.Table.ARROW, Item.Table.ARROW, Item.Table.ARROW], 1],
            [Item.Table.SMALL_HEALTH, 1]
        ];
    }

    handleHit(sourceThing, dmg) {
        if (this.dead) {
            return false;
        }
        super.handleHit(sourceThing, dmg);
        this.faceThing(sourceThing);
        this.target = sourceThing;
        return true;
    }
}
