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

/*********/
/* Items */
/*********/

function Item(image, type, quality) {
    this.image = image;
    this.type = type;
    this.quality = quality;
};

Item.prototype.isBetter = function(other)
{
    return (this.quality > other.quality);
}

Item.prototype.isArmour = function()
{
    return (this.type === Item.ARMOUR);
}

Item.prototype.isSword = function()
{
    return (this.type === Item.SWORD);
}

Item.prototype.isBow = function()
{
    return (this.type === Item.BOW);
}

// The various item types
Item.OTHER = 0;
Item.SWORD = 1;
Item.BOW = 2;
Item.ARMOUR = 3;
Item.HEALTH = 4;

// The list of takeable items. The values here are used to identify the items
// as well as referring to images on the GROUND_ITEMS sprite sheet.
Item.Table = {
    NO_ARMOUR:      new Item("helmet3", Item.ARMOUR, 0),
    LEATHER_ARMOUR: new Item("helmet1", Item.ARMOUR, 1),
    STEEL_ARMOUR:   new Item("helmet2", Item.ARMOUR, 2),
    COIN:           new Item("coin", Item.OTHER, 0),
    SMALL_HEALTH:   new Item("small_health", Item.HEALTH, 0),
    LARGE_HEALTH:   new Item("large_health", Item.HEALTH, 1),
    SMALL_BOW:      new Item("bow1", Item.BOW, 0),
    LARGE_BOW:      new Item("bow2", Item.BOW, 1),
    NO_BOW:         new Item("bow3", Item.BOW, 2),
    ARROW:          new Item("arrow1", Item.OTHER, 0),
    NO_SWORD:       new Item("sword4", Item.SWORD, 0),
    SMALL_SWORD:    new Item("sword1", Item.SWORD, 1),
    LARGE_SWORD:    new Item("sword2", Item.SWORD, 2),
    MAGIC_SWORD:    new Item("sword3", Item.SWORD, 3),
    NONE:           new Item(null, Item.OTHER, 0)
};

module.exports = Item;
