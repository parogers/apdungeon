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

function renderText(msg)
{
    var img = getFrame(UI, "0");

    var renderTexture = PIXI.RenderTexture.create(
	(img.width+1)*msg.length, img.height);
    var cnt = new PIXI.Container();
    for (var n = 0; n < msg.length; n++) 
    {
	var sprite = new PIXI.Sprite(getFrame(UI, msg[n]));
	sprite.x = n*(img.width+1);
	cnt.addChild(sprite);
    }

    renderer.render(cnt, renderTexture);
    return renderTexture;
}

/************/
/* HealthUI */
/************/

function HealthUI()
{
    //var texture = getTextures(GROUND_ITEMS)["coin"];
    this.sprite = new PIXI.Container();
    this.guiLayer = true;
    this.hearts = [];
    this.fullHeart = getFrame(UI, "full_heart");
    this.emptyHeart = getFrame(UI, "empty_heart");

    for (var n = 0; n < 3; n++) {
	this.addHeart();
    }
}

// Adds a heart to the UI
HealthUI.prototype.addHeart = function()
{
    var heart = new PIXI.Sprite(this.fullHeart);
    heart.scale.set(SCALE);
    this.hearts.push(heart);
    this.sprite.addChild(heart);

    var x = -this.hearts.length*(this.fullHeart.width+1)*SCALE;
    for (heart of this.hearts) {
	heart.x = x;
	x += (this.fullHeart.width+1)*SCALE;
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
    while (this.hearts.length < player.maxHealth) {
	this.addHeart();
    }
    // Remove hearts to match the player's max health
    while (this.hearts.length > player.maxHealth) {
	this.removeHeart();
    }
    // Synchronize the hearts to reflect the player's health
    for (var n = 0; n < this.hearts.length; n++) {
	if (n < player.health) {
	    this.hearts[n].texture = this.fullHeart;
	} else {
	    this.hearts[n].texture = this.emptyHeart;
	}
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
    this.sprite.scale.set(SCALE);
    this.guiLayer = true;
    this.baseItem = item;
    this.item = item;
    this.count = 0;
    this.itemSprite = new PIXI.Sprite(getFrame(GROUND_ITEMS, item));
    this.itemSprite.anchor.set(0.5, 0.5);
    this.itemSprite.x = 0.5;
    this.itemSprite.y = -0.5;
    this.slotSprite = new PIXI.Sprite(getFrame(UI, "small_slot"));
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
	this.textSprite.scale.set(0.6);
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
	this.itemSprite.texture = getFrame(GROUND_ITEMS, item);
    }
}

/***************/
/* InventoryUI */
/***************/

// Show the player inventory as a set of item slots (ItemSlotUI instances)
function InventoryUI()
{
    this.guiLayer = true;
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
	x += (slot.slotSprite.texture.width+1)*SCALE;
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
