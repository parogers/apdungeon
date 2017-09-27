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
	    var sprite = new PIXI.Sprite(getFrame(RES.UI, msg[n]));
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
	var bg = new PIXI.Sprite(getFrame(RES.UI, "black"));
	bg.scale.set(maxWidth/bg.width, y/bg.height);
	cnt.addChild(bg);
	cnt.children.unshift(cnt.children.pop());
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
    this.sprite = new PIXI.Container();
    this.hearts = [];
    this.fullHeart = getFrame(RES.UI, "full_heart");
    this.halfHeart = getFrame(RES.UI, "half_heart");
    this.emptyHeart = getFrame(RES.UI, "empty_heart");

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
    for (heart of this.hearts) {
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
    // Add hearts to match the player's max health
    while (this.hearts.length < Math.floor(player.maxHealth/2)) {
	this.addHeart();
    }
    // Remove hearts to match the player's max health
    while (this.hearts.length > Math.floor(player.maxHealth/2)) {
	this.removeHeart();
    }
    // Synchronize the hearts to reflect the player's health
    for (var n = 0; n < this.hearts.length; n++) {
	var img = null;
	if (n < Math.floor(player.health/2)) {
	    img = this.fullHeart;
	} else if (n < Math.floor((player.health+1)/2)) {
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
    this.itemSprite = new PIXI.Sprite(getFrame(RES.GROUND_ITEMS, item));
    this.itemSprite.anchor.set(0.5, 0.5);
    this.itemSprite.x = 0.5;
    this.itemSprite.y = -0.5;
    this.slotSprite = new PIXI.Sprite(getFrame(RES.UI, "small_slot"));
    this.slotSprite.anchor.set(0.5, 0.5);
    this.sprite.addChild(this.slotSprite);
    this.sprite.addChild(this.itemSprite);

    if (args && args.x) this.itemSprite.x += args.x;
    if (args && args.y) this.itemSprite.y += args.y;

    if (args && args.showCount) 
    {
	var img = renderText("--");
	this.textSprite = new PIXI.Sprite(img);
	this.textSprite.anchor.set(0.5, 0.5);
	this.textSprite.x = 0.5;
	this.textSprite.y = 6.5;
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
    if (item === Item.NONE) item = this.baseItem;
    if (this.item !== item) {
	this.item = item;
	this.itemSprite.texture = getFrame(RES.GROUND_ITEMS, item);
    }
}

/***************/
/* InventoryUI */
/***************/

// Show the player inventory as a set of item slots (ItemSlotUI instances)
function InventoryUI()
{
    this.sprite = new PIXI.Container();
    this.armourSlot = new ItemSlotUI(Item.NO_ARMOUR);
    this.swordSlot = new ItemSlotUI(Item.NO_SWORD);
    this.bowSlot = new ItemSlotUI(Item.NO_BOW, {x: -0.5});
    this.arrowSlot = new ItemSlotUI(Item.ARROW, {showCount: true});
    this.coinSlot = new ItemSlotUI(
	Item.COIN, {
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
    for (slot of this.slots) {
	this.sprite.addChild(slot.sprite);
	slot.sprite.x = x;
	x += (slot.slotSprite.texture.width+1);
    }
}

InventoryUI.prototype.update = function(dt)
{
    // TODO - use an event/listener system instead of doing this
    this.armourSlot.setItem(player.armour);
    this.swordSlot.setItem(player.sword);
    this.bowSlot.setItem(player.bow);
    this.arrowSlot.setCount(player.numArrows);
    this.coinSlot.setCount(player.numCoins);
}
