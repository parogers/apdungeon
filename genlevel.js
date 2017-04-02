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

function generateLevel()
{
    /* Generate the floor */
    var length = 50;
    var grid = createGrid(5, length);
    for (var row = 0; row < grid.rows; row++) {
	for (var col = 0; col < grid.cols; col++) {
	    var n = Math.random();
	    if (n < 0.5) grid[0][col] = "brick_wall_m";
	    else if (n < 0.8) grid[0][col] = "mossy_wall_m";
	    else grid[0][col] = "broken_wall_m";
	    grid[row][col] = "smooth_floor_m";
	}
    }

    var w = randint(4, 8);
    var pos = randint(2, grid.cols-2-w);
    for (var row = 1; row < grid.rows; row++)
	for (var col = pos-randint(0,2); col < pos+w+randint(0,2); col++)
	    grid[row][col] = "water";

    var pos = 0;
    while (true) 
    {
	nextpos = pos + randint(5, 10);
	if (nextpos >= grid.cols) break;

	if (Math.random() < 0.5) {
	    grid[0][randint(pos+1, nextpos-1)] = "gate_wall_1";
	}
	pos = nextpos;

	var w = 1;
	if (Math.random() < 0.5) {
	    w = randint(2, 4);
	}
	if (pos+w >= grid.cols) w = 0;

	var depth = randint(1, 2);
	for (var col = 0; col < w; col++) {
	    for (var row = 0; row < depth; row++) {
		if (row == 0) grid[row][pos+col] = "wall_behind";
		else grid[row][pos+col] = "wall_behind2";
	    }
	    grid[depth][pos+col] = "smooth_wall_m";
	}
	pos += w;
    }

    var bg = new TiledBackground(
	TILE_WIDTH, TILE_HEIGHT, 
	getTextures(MAPTILES),
	grid);
    var level = new Level(bg);

    for (var n = 0; n < 10; n++) {
	snake = new Scorpion();
	snake.sprite.x = 100+150*n;
	snake.sprite.y = 180+50*Math.sin(n*5);
	level.addThing(snake);
    }

    return level;
}
