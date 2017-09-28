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
var TiledBackground = require("./bg");
var Level = require("./level");
var Door = require("./door");
var Gate = require("./gate");
var Arena = require("./arena");
var SnakeLike = require("./snake");
var Goblin = require("./goblin");
var SkelWarrior = require("./skel_warrior");
var Ghost = require("./ghost");
var NPC = require("./npc");
var Chest = require("./chest");
var Item = require("./item");
var GroundItem = require("./grounditem");
var Utils = require("./utils");

var randint = Utils.randint;
var randomChoice = Utils.randomChoice;
var randUniform = Utils.randUniform;

var Snake = SnakeLike.Snake;
var Rat = SnakeLike.Rat;
var Scorpion = SnakeLike.Scorpion;

function monsterEntry(klass, score, addScore)
{
    return {
        klass: klass,
        score: score,
        addScore: addScore
    };
}

/* Returns some random treasures for a chest */
function randomTreasures(levelNum)
{
    switch(randint(1, 10)) {
    case 1:
        return [Item.Table.COIN, Item.Table.COIN, Item.Table.COIN];
    case 2:
        return [Item.Table.COIN, Item.Table.COIN, 
                Item.Table.COIN, Item.Table.COIN, Item.Table.COIN];
    case 3:
        if (levelNum < 2) return [Item.Table.SMALL_BOW, Item.Table.ARROW];
        else return [Item.Table.LARGE_BOW];
    case 4:
        if (levelNum < 2) return [Item.Table.LEATHER_ARMOUR];
        else return [Item.Table.STEEL_ARMOUR];
    case 5:
        return [Item.Table.SMALL_HEALTH, Item.Table.SMALL_HEALTH, 
                Item.Table.ARROW, Item.Table.ARROW];
    case 6:
    case 7:
        return [Item.Table.COIN, Item.Table.COIN, Item.Table.SMALL_HEALTH];
    case 8:
        return [Item.Table.COIN, Item.Table.COIN, Item.Table.LARGE_HEALTH];
    case 9:
        return [Item.Table.LARGE_SWORD];
    case 10:
        return [Item.Table.ARROW, Item.Table.ARROW, Item.Table.ARROW, 
                Item.Table.COIN, Item.Table.COIN];
    }
}

// Returns a list of randomly chosen monsters that fall within the budget
function chooseMonsters(budget)
{
    var monsterTable = [
        monsterEntry(Snake,       1, 1),
        monsterEntry(Rat,         1, 1),
        monsterEntry(Scorpion,    2, 1),
        monsterEntry(Goblin,      3, 2),
        monsterEntry(SkelWarrior, 4, 3),
        monsterEntry(Ghost,       5, 4)
    ];

    var picks = [];
    while (true)
    {
        // Compile a list of monster options to choose from
        var options = [];
        for (let entry of monsterTable) {
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

/**************/
/* EnterScene */
/**************/

/* A thing to handle the player entering a level. (door opens, player walks
 * through the door, looks around, door closes, level starts) */
function EnterScene(door)
{
    // Waiting for the cutscene to start
    this.IDLE = 0;
    // The cutscene has started
    this.START = 1;
    // Waiting for the door to finish opening
    this.OPENING_DOOR = 2;
    // Waiting for the player to enter the level
    this.PLAYER_ENTERING = 3;
    // Player is looking around
    this.PLAYER_LOOK_LEFT = 4;
    this.PLAYER_LOOK_RIGHT = 5;

    this.door = door;
    // No sprite associated with this thing
    this.sprite = null;
    this.state = this.IDLE;
    this.timer = 0;
    this.travelTime = 0;
}

EnterScene.prototype.update = function(dt)
{
    if (this.timer > 0) {
        this.timer -= dt;
        return;
    }

    let player = this.level.player;

    switch(this.state) {
    case this.IDLE:
        // Position the player behind the level so they're hidden, and centered 
        // on the door so the camera renders in the right place.
        player.sprite.x = this.door.sprite.x;
        player.sprite.y = this.door.sprite.y+1;
        player.sprite.zpos = Level.BEHIND_BACKGROUND_POS;
        player.hasControl = false;
        this.timer = 0.75;
        this.state = this.START;
        break;

    case this.START:
        // Start the door opening
        this.door.startOpening();
        this.state = this.OPENING_DOOR;
        break;

    case this.OPENING_DOOR:
        // Waiting for the door to open
        if (this.door.isOpen()) {
            player.sprite.zpos = undefined;
            this.state = this.PLAYER_ENTERING;
            this.timer = 0.4;
            this.travelTime = 0.6;
        }
        break;

    case this.PLAYER_ENTERING:
        // Player walking some ways into the level
        player.diry = 0.5;
        this.travelTime -= dt;
        if (this.travelTime <= 0) {
            this.state = this.PLAYER_LOOK_LEFT;
            this.timer = 0.5;
            this.door.startClosing();
            player.dirx = 0;
            player.diry = 0;
        } else if (this.travelTime < 0.35) {
            player.dirx = 0.25;
        }
        break;

    case this.PLAYER_LOOK_LEFT:
        player.faceDirection(-1);
        this.state = this.PLAYER_LOOK_RIGHT;
        this.timer = 1;
        break;

    case this.PLAYER_LOOK_RIGHT:
        player.faceDirection(1);
        player.hasControl = true;
        this.timer = 0.5;
        // Done!
        this.level.removeThing(this);
        break;
    }
}

/* Functions */

module.exports = {};

module.exports.generate = function(levelNum)
{
    // Generate the floor and top wall across the level
    var length = 100;
    var grid = Utils.createGrid(5, length);
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
        RES.TILE_WIDTH, RES.TILE_HEIGHT, RES.WALL_HEIGHT,
        Utils.getTextures(RES.MAPTILES), grid);
    var level = new Level(bg);

    // Now add some random gates throughout the level
    var pos = 0;
    while (true) 
    {
        if (Math.random() < 0.6 && pos > 0) 
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
                gate.sprite.x = pos*RES.TILE_WIDTH;
                gate.sprite.y = found*RES.TILE_HEIGHT;
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
    // The starting monster "budget" for this level. Harder monsters cost
    // more and multiples of the same monster may have an additional
    // cost. Each round is populated with monsters that fall within this 
    // budget. This is gradually reduced working backwards through the 
    // level to make earlier rounds a little easier.
    var budget = (levelNum+1)*6;
    while (endx > arenaWidth*1.75)
    {
        var arena = new Arena.Arena(level, arenaWidth, endx);
        level.addArena(arena);

        // Find the visible gates (for gate spawning below)
        var gates = [];
        for (let thing of level.things) {
            if (thing instanceof Gate &&
                thing.sprite.x > arena.startx && 
                thing.sprite.x < arena.endx)
            {
                gates.push(thing);
            }
        }

        // Higher levels have more rounds per arena on average
        for (var rnum = 0; rnum < randint(2, 4+levelNum); rnum++) 
        {
            var round = new Arena.Round(randUniform(0.5, 1));
            var monsters = null;

            if (rnum === 0 && levelNum === 0 && 
                endx === level.getWidth()-1) {
                // Lots of rats!
                monsters = [];
                for (var n = 0; n < randint(10, 20); n++) {
                    monsters.push(Rat);
                }
            } else {
                monsters = chooseMonsters(budget);
            }

            for (let klass of monsters) 
            {
                var spawn = null;
                var ypos = randUniform(0, level.camera.height);
                var style = randint(1, 5);

                if (style === 1 && klass !== Ghost) {
                    var xpos = randint(arena.startx+20, arena.endx-20);
                    spawn = new Arena.DropSpawn(
                        level, new klass(), xpos, ypos);
                } else if (style === 2 && gates.length > 0) {
                    spawn = new Arena.GateSpawn(
                        level, new klass(), randomChoice(gates));
                } else {
                    var xdir = randomChoice([-1, 1]);
                    if (endx >= level.getWidth()-1) xdir = -1;
                    spawn = new Arena.Spawn(level, new klass(), xdir, ypos);
                }
                round.addSpawn(spawn, randUniform(0, 1));
            }
            arena.rounds.push(round);
        }
        // Randomly add a chest into the arena
        if (randint(1, 10) < 7)
        {
            // Find some clear space to add it
            var xpos = randint(arena.startx+30, arena.endx-30);
            var ypos = randint(10, level.getHeight()-30);

            ypos = level.findClearSpace(xpos, ypos);
            if (ypos !== null) {
                var chest = new Chest(randomTreasures(levelNum));
                chest.sprite.x = xpos;
                chest.sprite.y = ypos;
                level.addThing(chest);
            }
        }
        // Skip some space to the previous arena (working backwards)
        endx -= (arenaWidth*randUniform(1, 1.25))|0;
        // Decrease the monster 'budget' so the arenas are slightly easier
        if (budget > 3) budget--;
    }

    // Add random coins scattered throughout the level
    for (var n = 0; n < randint(10, 20); n++) {
        var xpos = randint(level.camera.width+10, level.getWidth()-10);
        var ypos = randint(10, level.getHeight()-10);
        ypos = level.findClearSpace(xpos, ypos);
        if (ypos !== null) {
            var coin = new GroundItem(Item.Table.COIN, xpos, ypos);
            level.addThing(coin);
        }
    }

    // Add some health potions in the second half of the level
    for (var n = 0; n < randint(1, 5); n++) {
        var xpos = randint(level.getWidth()/2, level.getWidth()-10);
        var ypos = randint(10, level.getHeight()-10);
        ypos = level.findClearSpace(xpos, ypos);
        if (ypos !== null) {
            var coin = new GroundItem(Item.Table.SMALL_HEALTH, xpos, ypos);
            level.addThing(coin);
        }
    }

    if (levelNum === 0) {
        // First level in the game. Add a chest of starter items. Have the 
        // chest eject items to the right away from the first NPC. (so none
        // of the items become hidden behind)
        var items = [Item.Table.COIN, Item.Table.COIN, 
                     Item.Table.COIN, Item.Table.SMALL_SWORD];
        var chest = new Chest(items, {ejectX: 1});
        chest.sprite.x = 60;
        chest.sprite.y = 24;
        level.addThing(chest);

        // Add an NPC to give the player some dialog
        var npc = new NPC();
        npc.setDialog(["TAKE THIS AND", "GO FORTH!!!"]);
        npc.sprite.x = 46;
        npc.sprite.y = 25;
        level.addThing(npc);

        // Add an NPC to give the player some dialog
        var npc = new NPC("npc3_south_1");
        npc.setDialog("GOOD LUCK!");
        npc.sprite.x = 80;
        npc.sprite.y = 40;
        level.addThing(npc);
    }

    // Add a door to enter the level
    var door = new Door();
    door.sprite.x = 20;
    door.sprite.y = 12.8;
    level.addThing(door);

    var scn = new EnterScene(door);
    level.addThing(scn);

    // Add a door to exit the level
    var door = new Door();
    door.sprite.x = level.getWidth()-24;
    door.sprite.y = 12.8;
    level.exitDoor = door;
    //door.startOpening();
    level.addThing(door);

    return level;
}

module.exports.generateEmpty = function(rows, cols, value)
{
    var grid = Utils.createGrid(rows, cols, value);
    var bg = new TiledBackground(
        RES.TILE_WIDTH, RES.TILE_HEIGHT, RES.WALL_HEIGHT,
        Utils.getTextures(RES.MAPTILES), grid);
    return new Level(bg);
}

