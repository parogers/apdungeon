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

import { Resources, RES } from './res';
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
import { Bat } from './bat';

const randint = Utils.randint;
const randomChoice = Utils.randomChoice;
const randUniform = Utils.randUniform;

/* Functions */

function getChunk(name)
{
    const chunksData = Resources.shared.find(RES.CHUNKS);
    return new ChunkTemplate(
        chunksData[name].background,
        chunksData[name].midground,
        chunksData[name].things,
    );
}

export function generateLevel(levelNum)
{
    let bg = new Compound();
    bg.addChunk(new Chunk(getChunk('start')));
    bg.addChunk(new Chunk(getChunk('lavatest')));
    for (let n = 0; n < 10; n++) {
        bg.addChunk(new Chunk(getChunk('straight2')));
    }

    let level = new Level(bg);
    for (let chunk of level.compound.chunks)
    {
        chunk.spawnThings();
    }

    let x = 140;
    while (x < level.width)
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
    while (x < level.width)
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

    // // First level in the game. Add a chest of starter items. Have the
    // // chest eject items to the right away from the first NPC. (so none
    // // of the items become hidden behind)
    // let items = [
    //     Item.Table.COIN,
    //     Item.Table.COIN,
    //     Item.Table.COIN,
    //     Item.Table.SMALL_SWORD
    // ];
    // let chest = new Chest(items, {ejectX: 1});
    // chest.sprite.x = 60;
    // chest.sprite.y = 24;
    // level.addThing(chest);

    // // Add an NPC to give the player some dialog
    // let npc = new NPC();
    // npc.setDialog(['TAKE THIS AND', 'GO FORTH!!!']);
    // npc.sprite.x = 46;
    // npc.sprite.y = 25;
    // level.addThing(npc);
    //
    // // Add an NPC to give the player some dialog
    // npc = new NPC('npc_npc3_south_1');
    // npc.setDialog('GOOD LUCK!');
    // npc.sprite.x = 80;
    // npc.sprite.y = 40;
    // level.addThing(npc);

    return level;
}


// Returns a matrix (ie n[row][col]) of the given value. Also the number of
// rows and columns (rows, cols) are available as attributes.
function createGrid(rows, cols, value)
{
    let grid = [];
    grid.rows = rows;
    grid.cols = cols;
    for (let row = 0; row < rows; row++) {
        grid[row] = [];
        for (let col = 0; col < cols; col++) {
            grid[row][col] = value;
        }
    }
    return grid;
}

export function generateEmptyLevel(rows, cols, value)
{
    let grid = createGrid(rows, cols, value);
    let chunk = new ChunkTemplate(grid);
    chunk.renderTexture();
    return new Level(new Chunk(chunk));
}
