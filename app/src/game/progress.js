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

export function ProgressBar(width, height, text)
{
    this.width = width;
    this.height = height;
    this.current = 0;
    //this.text = null;
    this.sprite = new PIXI.Container();
    this.barSprite = new PIXI.Sprite();
    this.textSprite = new PIXI.Text(
        text, {fontFamily: 'Courier New', 
               fontSize: 20, 
               fill: 0xffffff,
               fontWeight: 'bold',
               align: 'center'});
    this.textSprite.y = height+5;
    //this.textSprite.scale.y = 0.5;
    this.sprite.addChild(this.barSprite);
    this.sprite.addChild(this.textSprite);
}

ProgressBar.prototype.setText = function(text)
{
    this.textSprite.text = text;
}

ProgressBar.prototype.update = function(value)
{
    this.current = value;
    let canvas = document.createElement("canvas");
    canvas.width = this.width;
    canvas.height = this.height;

    let ctx = canvas.getContext("2d");
    ctx.fillStyle = "#ddd";
    ctx.fillRect(0, 0, this.width*this.current, this.height);
    ctx.strokeStyle = "#f00";
    ctx.strokeRect(0, 0, this.width, this.height);

    this.barSprite.texture = PIXI.Texture.fromCanvas(canvas);
}
