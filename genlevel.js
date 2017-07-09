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

var LevelGenerator = (function() {

    function monsterEntry(klass, score, addScore)
    {
	return {
	    klass: klass,
	    score: score,
	    addScore: addScore
	};
    }

    var monsterTable = [
	monsterEntry(Snake,       1, 1),
	monsterEntry(Rat,         1, 1),
	monsterEntry(Scorpion,    2, 1),
	monsterEntry(Goblin,      3, 2),
	monsterEntry(SkelWarrior, 4, 3),
	monsterEntry(Ghost,       5, 4)
    ];

    var exports = {};

    function chooseMonsters(budget)
    {
	var picks = [];
	while (true)
	{
	    // Compile a list of monster options to choose from
	    var options = [];
	    for (entry of monsterTable) {
		if (entry.score <= budget) options.push(entry);
	    }
	    if (options.length === 0) break;
	    // Pick a monster at random
	    var opt = randomChoice(options)
	    picks.push(opt.klass);
	    budget -= opt.score;
	}
	return picks;
    }

    exports.generate = function(levelNum)
    {
	// Generate the floor and top wall across the level
	var length = 100;
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

	// Add a random spot of water somewhere
	var w = randint(4, 8);
	var pos = randint(10, grid.cols-2-w);
	for (var row = 1; row < grid.rows; row++)
	    for (var col = pos-randint(0,2); col < pos+w+randint(0,2); col++)
		grid[row][col] = "water";

	// Add random outcropping of wall sections
	var pos = 0;
	if (levelNum === 0) {
	    // Leave a large, empty space in the first level to make room for
	    // a starter chest and some NPCs
	    pos += 10;
	}
	while (true) 
	{
	    pos += randint(5, 10);
	    // Leave space at the end of the level
	    if (pos >= grid.cols-12) break;

	    var w = 1;
	    if (Math.random() < 0.5) {
		w = randint(3, 5);
	    }
	    if (pos+w >= grid.cols) w = 0;

	    var depth = randomChoice([1, 1, 2, 2, 3]);
	    for (var col = 0; col < w; col++) {
		for (var row = 0; row < depth; row++) {
		    if (row == 0) grid[row][pos+col] = "wall_behind";
		    else grid[row][pos+col] = "wall_behind2";
		}
		grid[depth][pos+col] = "smooth_wall_m";
	    }
	    pos += w;
	}

	// Add a vertical wall to either side of the level
	for (var row = 0; row < grid.rows-1; row++) {
	    grid[row][0] = "wall_behind2";
	    grid[row][grid.cols-1] = "wall_behind2";
	}
	grid[0][0] = "wall_behind";
	grid[0][grid.cols-1] = "wall_behind";
	grid[grid.rows-1][0] = "smooth_wall_m";
	grid[grid.rows-1][grid.cols-1] = "smooth_wall_m";

	// Build a big sprite for the tiled map
	var bg = new TiledBackground(
	    TILE_WIDTH, TILE_HEIGHT, WALL_HEIGHT,
	    getTextures(MAPTILES), grid);
	var level = new Level(bg);

	// Now add some random gates throughout the level
	var pos = 0;
	while (true) 
	{
	    if (Math.random() < 0.5 && pos > 0) 
	    {
		// Find the bottom-most section of wall
		var found = -1;
		for (var row = grid.rows-1; row >= 0; row--) {
		    if (grid[row][pos] && 
			grid[row][pos] !== "wall_behind" && 
			grid[row][pos] !== "wall_behind2" && 
			grid[row][pos].indexOf("wall") !== -1)
		    {
			found = row;
			break
		    }
		}
		if (found !== -1) {
		    var gate = new Gate();
		    gate.sprite.x = pos*TILE_WIDTH*SCALE;
		    gate.sprite.y = found*TILE_HEIGHT*SCALE;
		    level.addThing(gate);
		}
	    }
	    pos += randint(5, 15);
	    if (pos >= grid.cols-5) break;
	}

	// Break the level down into "arena" sections where the player gets
	// to fight monsters. We start with an arena at the very end of the 
	// level, then work backwards from there.
	var endx = level.getWidth()-1;
	var arenaWidth = level.camera.width;
	var budget = (levelNum+1)*6;
	while (false) //endx > arenaWidth*2)
	{
	    var arena = new Arena(arenaWidth, endx);
	    level.addArena(arena);

	    var numRounds = randint(2, 4);

	    for (var n = 0; n < numRounds; n++) {
		var round = new Round(randUniform(0.5, 1));
		var monsters = chooseMonsters(budget);
		for (klass of monsters) 
		{
		    var spawn = null;
		    var ypos = randUniform(0, level.camera.height);
		    if (randint(1, 5) === 1) {
			var xpos = randint(arena.startx, arena.endx);
			spawn = new DropSpawn(new klass(), xpos, ypos);
		    } else {
			var xdir = randomChoice([-1, 1]);
			if (endx >= level.getWidth()-1) xdir = -1;
			spawn = new Spawn(new klass(), xdir, ypos);
		    }
		    round.addSpawn(spawn, randUniform(0, 1));
		}
		arena.rounds.push(round);
	    }

	    endx -= (arenaWidth*randUniform(1, 1.5))|0;
	    if (budget > 3) budget--;
	}

	if (levelNum === 0) {
	    // First level in the game. Add a chest of starter items. Have the 
	    // chest eject items to the right away from the first NPC. (so none
	    // of the items become hidden behind)
	    var items = [Item.COIN, Item.COIN, Item.COIN, Item.SMALL_SWORD];
	    var chest = new Chest(items, {ejectX: 1});
	    chest.sprite.x = 300;
	    chest.sprite.y = 120;
	    level.addThing(chest);

	    // Add an NPC to give the player some dialog
	    var npc = new NPC();
	    npc.setDialog(["TAKE THIS AND", "GO FORTH!!!"]);
	    npc.sprite.x = 230;
	    npc.sprite.y = 125;
	    level.addThing(npc);

	    // Add an NPC to give the player some dialog
	    var npc = new NPC("npc3_south_1");
	    npc.setDialog("GOOD LUCK!");
	    npc.sprite.x = 400;
	    npc.sprite.y = 200;
	    level.addThing(npc);
	}

	// Add a door to enter the level
	var door = new Door();
	door.sprite.x = 100;
	door.sprite.y = 64;
	level.addThing(door);

	var scn = new EnterScene(door);
	level.addThing(scn);

	// Add a door to exit the level
	var door = new Door();
	door.sprite.x = level.getWidth()-120;
	door.sprite.y = 64;
	level.exitDoor = door;
	door.startOpening();
	level.addThing(door);

	return level;
    }
    return exports;
})();
