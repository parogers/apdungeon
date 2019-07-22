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

import { RES } from './res';
import { Utils } from './utils';
import { Chunk, CompoundBackground, TiledBackground } from './bg';
import { Level } from './level';
import { Door } from './door';
import { Gate } from './gate';
import { Snake, Rat, Scorpion } from './snake';
import { Goblin } from './goblin';
import { SkelWarrior } from './skel_warrior';
import { Ghost } from './ghost';
import { NPC } from './npc';
import { Chest } from './chest';
import { Item } from './item';
import { GroundItem } from './grounditem';
import { GameControls, ManualControls } from './controls';
import { Spawn } from './spawn';

var randint = Utils.randint;
var randomChoice = Utils.randomChoice;
var randUniform = Utils.randUniform;

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
        player.controls = new ManualControls();
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
            player.moveToTrack(this.level.getBottomTrack());
        }
        break;

    case this.PLAYER_ENTERING:
        // Player walking some ways into the level
        /*player.controls.diry = 0.5;
        if (player.sprite.y >= track.y)
        {
            player.sprite.y = track.y;
            player.controls.diry = 0;
            this.state = this.PLAYER_LOOK_LEFT;
            }*/

        // Wait for the player to hit the track
        if (!player.isMovingToTrack()) {
            this.state = this.PLAYER_LOOK_LEFT;
        }

        /*this.travelTime -= dt;
        if (this.travelTime <= 0) {
            this.state = this.PLAYER_LOOK_LEFT;
            this.timer = 0.5;
            this.door.startClosing();
            player.controls.dirx = 0;
            player.controls.diry = 0;
        } else if (this.travelTime < 0.35) {
            player.controls.dirx = 0.25;
        }*/
        break;

    case this.PLAYER_LOOK_LEFT:
        player.faceDirection(-1);
        this.state = this.PLAYER_LOOK_RIGHT;
        this.timer = 0.5;
        break;

    case this.PLAYER_LOOK_RIGHT:
        player.faceDirection(1);
        this.timer = 0.5;
        // Done!
        this.state = this.PLAYER_DONE;
        break;

    case this.PLAYER_DONE:
        player.controls = GameControls.getControls();
        player.running = true;
        this.level.removeThing(this);
        break;
    }
}

/* Functions */

function spawnThings(level)
{
    let tileset = Utils.getTileset();
    let door = null;

    level.bg.forEachChunk(chunk => {
        for (let obj of chunk.things)
        {
            if (obj.name == 'start')
            {
                let x = obj.x - tileset.tileWidth/2;
                let y = obj.y - tileset.tileHeight/2;

                // Add a door to enter the level
                door = new Door();
                door.sprite.x = x + door.sprite.anchor.x * door.sprite.texture.width;
                door.sprite.y = y + door.sprite.anchor.y * door.sprite.texture.height;
                level.addThing(door);
                level.addThing(new EnterScene(door));
            }
            else if (obj.type == 'spawn') {
                console.log('spawner!');
                let spawn = new Spawn(obj.x, obj.y);
                level.addThing(spawn);
            }
        }
    });

    if (!door) {
        throw Error('level does not contain a starting door');
    }
}

export function generateLevel(levelNum)
{
    let bg = new CompoundBackground();

    let chunk = Utils.getChunk('start');
    bg.appendBackground(new TiledBackground(chunk));
    for (let n = 0; n < 10; n++) {
        bg.appendBackground(new TiledBackground(Utils.getChunk('straight')));
        bg.appendBackground(new TiledBackground(Utils.getChunk('straight2')));
    }

    var level = new Level(bg);
    spawnThings(level);

    // First level in the game. Add a chest of starter items. Have the 
    // chest eject items to the right away from the first NPC. (so none
    // of the items become hidden behind)
    var items = [
        Item.Table.COIN,
        Item.Table.COIN, 
        Item.Table.COIN,
        Item.Table.SMALL_SWORD
    ];
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

    return level;
}

export function generateEmptyLevel(rows, cols, value)
{
    let grid = Utils.createGrid(rows, cols, value);
    let chunk = new Chunk(grid);
    chunk.renderTexture();
    return new Level(new TiledBackground(chunk));
}
