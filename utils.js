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

// Returns a random number integer between a & b (inclusive)
function randint(a, b)
{
    return (a + (b-a+1)*Math.random())|0;
}

// Returns a random number selected uniformly over the interval [a, b)
function randUniform(a, b)
{
    return (a + (b-a+1)*Math.random());
}

// Returns a random element selected uniformly from the given list
function randomChoice(lst)
{
    var n = (Math.random() * lst.length)|0;
    return lst[n];
}

// Returns a matrix (ie n[row][col]) of the given value. Also the number of
// rows and columns (rows, cols) are available as attributes.
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

// Returns a sprite used for monsters/player treading water
function createSplashSprite()
{
    waterSprite = new PIXI.Sprite();
    waterSprite.scale.set(SCALE);
    waterSprite.anchor.set(0.5, 0.5);
    waterSprite.visible = false;
    waterSprite.texture = getTextures(MAPTILES)["treading_water"];
    return waterSprite;
}

function createBloodSpatter(imgs)
{
    var sprite = new PIXI.Sprite(getTextures(MAPTILES)[
	randomChoice(imgs || ["blood1", "blood2", "blood3"])
    ]);
    sprite.scale.set(SCALE);
    sprite.zpos = FLOOR_POS;
    sprite.anchor.set(0.5, 0.5);
    return sprite;
}

// Helper function for returning a texture set given the resource string
function getTextures(res)
{
    return PIXI.loader.resources[res].textures;
}

function getFrame(res, name)
{
    return getTextures(res)[name];
}

function getFrames(res, names)
{
    var frames = [];
    for (var n = 0; n < names.length; n++) {
	var frame = getTextures(res)[names[n]];
	if (!frame) console.log("ERROR: missing frame " + names[n]);
	frames.push(frame);
    }
    return frames;
}

// Updates a dictionary with the contents of another dictionary
function updateDict(dict, other)
{
    for (key in other) {
	dict[key] = other[key];
    }
}

/************/
/* Sequence */
/************/

function Sequence()
{
    var args = arguments[0];
    for (key in args) {
	this[key] = args[key];
    }
    this.done = false;
    this.numSteps = arguments.length-1;
    this.labels = {};
    for (var n = 1; n < arguments.length; n++) {
	// The sequence contains functions to call, and embedded strings to
	// use as labels. (for looping, branching, etc)
	if (arguments[n].constructor === String) {
	    this.labels[arguments[n]] = n-1;
	} else {
	    // Note functions are assigned to this object, so that calling
	    // them this way gives us access to 'this' inside.
	    var name = "func_" + (n-1);
	    this[name] = arguments[n];
	}
    }
    // The current state. This advances incrementally by default, and 
    // occasionally jumping randomly to another state.
    this.state = 0;
    // Delay before advancing the state
    this.delay = 0;
    this.NEXT = true;
}

Sequence.prototype.update = function(dt)
{
    if (this.done) return;
    if (this.delay > 0) {
	this.delay -= dt;
	return;
    }
    // Check if the current state is a function (or a label)
    var fname = "func_" + this.state;
    if (this[fname]) {
	var ret = this[fname](dt);
	if (ret === this.NEXT) {
	    // Advance to the next state
	    this.state++;
	} else if (ret) {
	    // Jump to another state
	    this.state = this.labels[ret];
	}
    } else {
	// Skip over the label
	this.state++;
    }
    if (this.state >= this.numSteps) {
	this.done = true;
    }
}
