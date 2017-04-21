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

/* Cross platform way of requesting an animation update
 * (see http://jlongster.com/Making-Sprite-based-Games-with-Canvas) */
var requestAnimFrame =
	window.requestAnimationFrame ||
	window.webkitRequestAnimationFrame ||
	window.mozRequestAnimationFrame ||
	window.oRequestAnimationFrame ||
	window.msRequestAnimationFrame ||
	function(callback){
	    window.setTimeout(callback, 1000 / 60);
	};

/* Returns a random number integer between a & b (inclusive) */
function randint(a, b)
{
    return (a + (b-a+1)*Math.random())|0;
}

function randUniform(a, b)
{
    return (a + (b-a+1)*Math.random());
}

/* Returns a random element selected uniformly from the given list */
function randomChoice(lst)
{
    var n = (Math.random() * lst.length)|0;
    return lst[n];
}

function createGrid(rows, cols, value)
{
    var grid = [];
    grid.rows = rows;
    grid.cols = cols;
    for (var row = 0; row < rows; row++) {
	grid[row] = [];
	for (var col = 0; col < cols; col++) {
	    grid[row][col] = value;
	}
    }
    return grid;
}

function createSplashSprite()
{
    waterSprite = new PIXI.Sprite();
    waterSprite.scale.set(SCALE);
    waterSprite.anchor.set(0.5, 0.5);
    waterSprite.visible = false;
    waterSprite.texture = getTextures(MAPTILES)["treading_water"];
    return waterSprite;
}
