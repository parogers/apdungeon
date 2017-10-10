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

var RES = require("./res");
var Utils = require("./utils");
var Render = require("./render");
var Item = require("./item");
var Audio = require("./audio");

function renderText(lines, options)
{
    if (!(lines instanceof Array)) lines = [lines];

    var maxWidth = 0;
    var cnt = new PIXI.Container();
    var y = 1;
    for (var row = 0; row < lines.length; row++) 
    {
        var x = 1;
        var msg = lines[row];
        var height = 0;
        for (var n = 0; n < msg.length; n++) 
        {
            var sprite = new PIXI.Sprite(Utils.getFrame(RES.UI, msg[n]));
            sprite.anchor.set(0,0);
            sprite.x = x;
            sprite.y = y;
            // Make spaces a bit more narrow (looks better)
            if (msg[n] === " ") x += (sprite.width+1)/2;
            else x += sprite.width+1;
            cnt.addChild(sprite);
            height = Math.max(height, sprite.height);
        }
        maxWidth = Math.max(maxWidth, x);
        y += height+1;
    }

    if (options && options.blackBG) {
        var bg = new PIXI.Sprite(Utils.getFrame(RES.UI, "black"));
        bg.scale.set(maxWidth/bg.width, y/bg.height);
        cnt.addChildAt(bg, 0);
        // TODO - why doesn't this work for render textures?
        //renderer.backgroundColor = 0x000000;
    }

    var renderTexture = PIXI.RenderTexture.create(maxWidth, y);
    Render.getRenderer().render(cnt, renderTexture);
    return renderTexture;
}

/************/
/* HealthUI */
/************/

function HealthUI()
{
    this.player = null;
    this.sprite = new PIXI.Container();
    this.hearts = [];
    this.fullHeart = Utils.getFrame(RES.UI, "full_bigheart");
    this.halfHeart = Utils.getFrame(RES.UI, "half_bigheart");
    this.emptyHeart = Utils.getFrame(RES.UI, "empty_bigheart");

    for (var n = 0; n < 3; n++) {
        this.addHeart();
    }
}

// Adds a heart to the UI
HealthUI.prototype.addHeart = function()
{
    var heart = new PIXI.Sprite(this.fullHeart);
    this.hearts.push(heart);
    this.sprite.addChild(heart);

    var x = -this.hearts.length*(this.fullHeart.width+1);
    for (let heart of this.hearts) {
        heart.x = x;
        x += (this.fullHeart.width+1);
    }
}

// Removes the last heart from this UI
HealthUI.prototype.removeHeart = function()
{
    if (this.hearts.length > 0) {
        this.sprite.removeChild(this.hearts.pop());
    }
}

HealthUI.prototype.update = function(dt)
{
    if (!this.player) return;

    // Add hearts to match the player's max health
    while (this.hearts.length < Math.floor(this.player.maxHealth/2)) {
        this.addHeart();
    }
    // Remove hearts to match the player's max health
    while (this.hearts.length > Math.floor(this.player.maxHealth/2)) {
        this.removeHeart();
    }
    // Synchronize the hearts to reflect the player's health
    for (var n = 0; n < this.hearts.length; n++) {
        var img = null;
        if (n < Math.floor(this.player.health/2)) {
            img = this.fullHeart;
        } else if (n < Math.floor((this.player.health+1)/2)) {
            img = this.halfHeart;
        } else {
            img = this.emptyHeart;
        }
        this.hearts[n].texture = img;
    }
}

/**************/
/* ItemSlotUI */
/**************/

// A single inventory slot, showing the picture of an item (from the tile
// sheet GROUND_ITEMS) and optionally a quantity value below.
function ItemSlotUI(item, args)
{
    this.sprite = new PIXI.Container();
    this.baseItem = item;
    this.item = item;
    this.count = 0;
    this.itemSprite = new PIXI.Sprite(
        Utils.getFrame(RES.GROUND_ITEMS, item.image));
    this.itemSprite.anchor.set(0.5, 0);
    this.itemSprite.x = 0.5;
    this.itemSprite.y = 0;
    this.slotSprite = new PIXI.Sprite(Utils.getFrame(RES.UI, "small_slot"));
    this.slotSprite.anchor.set(0.5, 0);
    this.sprite.addChild(this.slotSprite);
    this.sprite.addChild(this.itemSprite);

    if (args && args.x) this.itemSprite.x += args.x;
    if (args && args.y) this.itemSprite.y += args.y;

    if (args && args.showCount) 
    {
        var img = renderText("--");
        this.textSprite = new PIXI.Sprite(img);
        this.textSprite.anchor.set(0.5, 0.5);
        this.textSprite.x = 0;
        this.textSprite.y = 12;
        this.textSprite.scale.set(0.75);
        this.sprite.addChild(this.textSprite);
    }
}

ItemSlotUI.prototype.setCount = function(count)
{
    if (this.textSprite && this.count !== count)
    {
        this.count = count;
        if (count === 0) count = "--";
        else if (count < 9) count = "0" + count;
        this.textSprite.texture = renderText(""+count);
    }
}

ItemSlotUI.prototype.setItem = function(item)
{
    // If no item is specified, use the item passed to the constructor instead
    if (item === Item.Table.NONE) item = this.baseItem;
    if (this.item !== item) {
        this.item = item;
        this.itemSprite.texture = Utils.getFrame(RES.GROUND_ITEMS, item.image);
    }
}

/***************/
/* InventoryUI */
/***************/

// Show the player inventory as a set of item slots (ItemSlotUI instances)
function InventoryUI()
{
    this.player = null;
    this.sprite = new PIXI.Container();
    this.armourSlot = new ItemSlotUI(Item.Table.NO_ARMOUR);
    this.swordSlot = new ItemSlotUI(Item.Table.NO_SWORD);
    this.bowSlot = new ItemSlotUI(Item.Table.NO_BOW, {x: -0.5});
    this.arrowSlot = new ItemSlotUI(Item.Table.ARROW, {showCount: true});
    this.coinSlot = new ItemSlotUI(
        Item.Table.COIN, {
            showCount: true,
            x: -0.5,
            y: 0.5
        });

    this.slots = [
        this.armourSlot,
        this.swordSlot,
        this.bowSlot,
        this.arrowSlot,
        this.coinSlot,
    ];
    var x = 0;
    for (let slot of this.slots) {
        this.sprite.addChild(slot.sprite);
        slot.sprite.x = x;
        x += (slot.slotSprite.texture.width+1);
    }
}

InventoryUI.prototype.update = function(dt)
{
    if (this.player) {
        // TODO - use an event/listener system instead of doing this
        this.armourSlot.setItem(this.player.armour);
        this.swordSlot.setItem(this.player.sword);
        this.bowSlot.setItem(this.player.bow);
        this.arrowSlot.setCount(this.player.numArrows);
        this.coinSlot.setCount(this.player.numCoins);
    }
}

/**********/
/* Button */
/**********/

class Button
{
    constructor(stateList)
    {
        this.onclick = null;
        this.sprite = new PIXI.Sprite();
        this.sprite.anchor.set(0, 0);
        this.states = {};
        this.state = null;
        stateList.forEach(arg => {
            let name = arg[0];
            let img = arg[1];
            this.states[name] = Utils.getFrame(RES.UI, img);
            if (!this.state) this.state = name;
        });
        this.setState(this.state);
        this.sprite.interactive = true;
        this.sprite.click = () => {
            if (this.onclick) this.onclick();
        };
    }

    setState(state)
    {
        if (state && this.states.hasOwnProperty(state)) {
            this.sprite.texture = this.states[state];
            this.state = state;
        }
    }
}

/**********/
/* GameUI */
/**********/

class GameUI
{
    constructor() 
    {
        this.container = new PIXI.Container();
        this.healthUI = new HealthUI(this);
        this.inventoryUI = new InventoryUI(this);
        this.bg = new PIXI.Sprite(Utils.getFrame(RES.UI, "black"));
        this.audioButton = new Button([
            ["on", "audio-on"],
            ["off", "audio-off"]
        ]);
        this.audioButton.onclick = () => {
            if (this.audioButton.state === "on") {
                this.audioButton.setState("off");
                Audio.setEnabled(false);
            } else {
                this.audioButton.setState("on");
                Audio.setEnabled(true);
            }
        };

        this.container.addChild(this.bg);
        this.container.addChild(this.healthUI.sprite);
        this.container.addChild(this.inventoryUI.sprite);
        this.container.addChild(this.audioButton.sprite);
    }

    destroy() {
        if (this.container) {
            this.container.destroy();
            this.container = null;
            this.healthUI = null;
            this.inventoryUI = null;
            this.bg = null;
            this.audioButton = null;
        }
    }

    setPlayer(player) {
        this.healthUI.player = player;
        this.inventoryUI.player = player;
    }

    update(dt) {
        this.healthUI.update(dt);
        this.inventoryUI.update(dt);
    }

    /* Layout the on-screen GUI (inventory, sprites, etc) given the overall
     * screen size (width, height) and the y-position of the horizontal 
     * dividing line between the level and controls. (hsplit) */
    doLayout(width, height) 
    {
        this.inventoryUI.sprite.position.set(5.5, 1);
        this.audioButton.sprite.position.set(
            width-this.audioButton.sprite.width-1, 1);
        this.healthUI.sprite.position.set(86, 2);
        this.bg.scale.set(
            width/this.bg.texture.width, 
            height/this.bg.texture.height);
    }
}

module.exports = {
    renderText: renderText,
    HealthUI: HealthUI,
    InventoryUI: InventoryUI,
    ItemSlotUI: ItemSlotUI,
    GameUI: GameUI
};
