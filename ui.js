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

/***********/
/* ArrowUI */
/***********/

function ItemSlotUI(item, args)
{
    this.sprite = new PIXI.Container();
    this.sprite.scale.set(SCALE);
    this.guiLayer = true;
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

    if (args.showCount) 
    {
	var img = renderText("--");
	this.textSprite = new PIXI.Sprite(img);
	this.textSprite.anchor.set(0.5, 0.5);
	this.textSprite.x = 0;
	this.textSprite.y = 7;
	this.textSprite.scale.set(0.5);
	this.sprite.addChild(this.textSprite);
    }
}
