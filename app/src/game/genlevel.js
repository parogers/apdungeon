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
import { ChunkTemplate, Compound, Chunk } from './bg';
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
import { Spawn } from './spawn';
import { Bat } from './bat';

const randint = Utils.randint;
const randomChoice = Utils.randomChoice;
const randUniform = Utils.randUniform;

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
    let monsterTable = [
        monsterEntry(Snake,       1, 1),
        monsterEntry(Rat,         1, 1),
        monsterEntry(Scorpion,    2, 1),
        monsterEntry(Goblin,      3, 2),
        monsterEntry(SkelWarrior, 4, 3),
        monsterEntry(Ghost,       5, 4)
    ];

    let picks = [];
    while (true)
    {
        // Compile a list of monster options to choose from
        let options = [];
        for (let entry of monsterTable) {
            if (entry.score <= budget) options.push(entry);
        }
        if (options.length === 0) break;
        // Pick a monster at random
        let opt = randomChoice(options)
        picks.push(opt.klass);
        budget -= opt.score;
    }
    return picks;
}

/* Functions */

export function generateLevel(levelNum)
{
    let bg = new Compound();
    bg.addChunk(new Chunk(Utils.getChunk('start')));
    bg.addChunk(new Chunk(Utils.getChunk('lavatest')));
    for (let n = 0; n < 10; n++) {
        bg.addChunk(new Chunk(Utils.getChunk('straight2')));
    }

    let level = new Level(bg);
    for (let chunk of level.compound.chunks)
    {
        chunk.spawnThings();
    }

    let x = 140;
    while (x < level.getWidth())
    {
        let thing = new GroundItem(
            Item.Table.COIN,
            x,
            level.getTrack(randint(0, 2)).y-2,
        );
        level.addThing(thing);
        x += randint(40, 60);
    }

    x = 120;
    while (x < level.getWidth())
    {
        let monster = null;
        let n = randint(0, 2);

        if (n === 0) monster = new Snake();
        else if (n === 1) monster = new Rat();
        else if (n === 2) monster = new Scorpion();

        monster.fx = x;
        monster.track = level.getTrack(randint(0, 2));
        level.addThing(monster);
        x += randint(40, 120);
    }

    let mon = new SkelWarrior();
    mon.fx = 90;
    mon.track = level.getMiddleTrack();
    level.addThing(mon);

    /*let mon = new Bat();
    mon.fx = 90;
    mon.track = level.getMiddleTrack();
    level.addThing(mon);*/

    // First level in the game. Add a chest of starter items. Have the 
    // chest eject items to the right away from the first NPC. (so none
    // of the items become hidden behind)
    let items = [
        Item.Table.COIN,
        Item.Table.COIN, 
        Item.Table.COIN,
        Item.Table.SMALL_SWORD
    ];
    let chest = new Chest(items, {ejectX: 1});
    chest.sprite.x = 60;
    chest.sprite.y = 24;
    level.addThing(chest);

    // Add an NPC to give the player some dialog
    let npc = new NPC();
    npc.setDialog(["TAKE THIS AND", "GO FORTH!!!"]);
    npc.sprite.x = 46;
    npc.sprite.y = 25;
    level.addThing(npc);

    // Add an NPC to give the player some dialog
    npc = new NPC("npc3_south_1");
    npc.setDialog("GOOD LUCK!");
    npc.sprite.x = 80;
    npc.sprite.y = 40;
    level.addThing(npc);

    return level;
}

export function generateEmptyLevel(rows, cols, value)
{
    let grid = Utils.createGrid(rows, cols, value);
    let chunk = new ChunkTemplate(grid);
    chunk.renderTexture();
    return new Level(new Chunk(chunk));
}
