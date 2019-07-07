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

import { RES } from "./res";
import { Utils } from "./utils";
import { Thing, Hitbox } from "./thing";
import { GroundItem } from "./grounditem";
import { Audio } from "./audio";

/* A container for holding items. The chest is opened when the player touches
 * it, and the chests contents are ejected randomly.
 * 
 * items - array of Item types
 * options.ejectX - a particular X direction to eject the items 
 * */
export class Chest {

    constructor(items, options)
    {
        for (let item of items) {
            if (!item) throw Error("item cannot be null");
        }
        this.openTexture = Utils.getFrame(RES.MAPTILES, "chest_open");
        this.closedTexture = Utils.getFrame(RES.MAPTILES, "chest_closed");
        this.sprite = new PIXI.Sprite(this.closedTexture);
        this.sprite.anchor.set(0.5, 0.75);
        this.isOpen = false;
        this.timer = 0;
        this.items = items;
        this.options = options;
        this.hitbox = new Hitbox(0, 0, 5, 5);
    }

    update(dt)
    {
        if (this.isOpen && this.timer > 0) {
            this.timer -= dt;
            if (this.timer <= 0) {
                // Eject the contents from the chest
                for (let item of this.items) {
                    var gnd = new GroundItem(
                        item, 
                        this.sprite.x+1*Utils.randUniform(0, 1), 
                        this.sprite.y+2*Utils.randUniform(0.1, 1));
                    this.level.addThing(gnd);
                    var spd = Utils.randUniform(6, 12);
                    if (this.options && this.options.ejectX) {
                        gnd.velx = this.options.ejectX*spd;
                    } else {
                        gnd.velx = Utils.randomChoice([-1, 1])*spd;
                    }
                    gnd.velz = -Utils.randUniform(-2, 6);
                    gnd.velh = -30*Utils.randUniform(0.9, 1);
                }
            }
        }
    }

    handleHit(x, y, dmg)
    {
    }

    handlePlayerCollision(player)
    {
        if (!this.isOpen) {
            // Open the chest now and start a countdown timer before ejecting 
            // the contents.
            this.sprite.texture = this.openTexture;
            this.isOpen = true;
            this.timer = 0.25;
            Audio.playSound(RES.CHEST_SND);
        }
    }
};
