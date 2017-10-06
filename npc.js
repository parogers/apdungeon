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

var UI = require("./ui");
var RES = require("./res");
var Thing = require("./thing");
var Utils = require("./utils");

function NPC(img)
{
    // Position of the hit box, relative to the sprite position
    this.hitbox = new Thing.Hitbox(0, 0, 5, 5);
    var texture = Utils.getFrame(RES.NPC_TILESET, img || "npc1_south_1");
    this.sprite = new PIXI.Container();
    this.npcSprite = new PIXI.Sprite(texture);
    this.npcSprite.anchor.set(0.5, 1);
    this.sprite.addChild(this.npcSprite);

    this.textSprite = new PIXI.Sprite(UI.renderText("?"));
    this.textSprite.scale.set(3/5.);
    this.textSprite.anchor.set(0.5, 1);
    this.textSprite.y = -this.npcSprite.height-2;
    this.textSprite.visible = false;
    this.sprite.addChild(this.textSprite);

    this.visibleTimer = 0;
}

NPC.prototype.setDialog = function(lines)
{
    this.textSprite.texture = UI.renderText(lines, {blackBG: true})
}

NPC.prototype.update = function(dt)
{
    // Always face the player
    var dirx = Math.sign(this.level.player.sprite.x-this.sprite.x);
    this.npcSprite.scale.x = Math.abs(this.npcSprite.scale.x)*dirx;

    if (this.visibleTimer > 0) {
        this.visibleTimer -= dt;
        if (this.visibleTimer <= 0) {
            this.textSprite.visible = false;
        }
    }
}

NPC.prototype.handleHit = function(x, y, dmg)
{
    this.setDialog(["HEY CAREFUL", "WITH THAT!"]);
    this.handlePlayerCollision();
}

NPC.prototype.handlePlayerCollision = function(player)
{
    if (!this.textSprite.visible) {
        this.textSprite.visible = true;
    }
    this.visibleTimer = 1;
}

module.exports = NPC;

