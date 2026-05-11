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

import * as PIXI from 'pixi.js';
import { Noise } from 'noisejs';

import { Resources, RES, TILE_HEIGHT } from './res';
import { Utils } from './utils';
import { Render } from './render';
import { GroundItem } from './grounditem';
import { StackedGrid, getHitMapFromTileSheet } from '@parogers/pixijs-easygrid';


const DEFAULT_GRAVITY = 150;


/*****************/
/* LevelDarkness */
/*****************/

export class LevelDarkness
{
    constructor()
    {
        function renderDarkness(w, h, xrad, yrad)
        {
            let texture = PIXI.RenderTexture.create(w, h);
            let cnt = new PIXI.Container();
            let dark_shadow = Resources.shared.getFrame('dark_shadow_square');
            let light_shadow = Resources.shared.getFrame('light_shadow_square');

            for (let y = 0; y < h; y++)
            {
                for (let x = 0; x < w; x++)
                {
                    let dist = ((x-w/2)/xrad)**2 + ((y-h/2)/yrad)**2;
                    let shadow = null;

                    if (dist > 1)
                    {
                        shadow = dark_shadow;
                    }
                    else if (dist > 0.85)
                    {
                        shadow = light_shadow;
                    }
                    if (shadow)
                    {
                        let sprite = new PIXI.Sprite(shadow);
                        sprite.x = x;
                        sprite.y = y;
                        sprite.scale.set(1, 1);
                        cnt.addChild(sprite);
                    }
                }
            }
            Render.getRenderer().render(cnt, texture);
            return texture;
        }

        this.sprite = new PIXI.Sprite(
            renderDarkness(100, 60, 52, 32)
        );
        this.sprite.zIndex = Level.FRONT_POS;
    }

    update(dt) {
    }
}

/*********/
/* Level */
/*********/

export class Level
{
    constructor()
    {
        // The various level states
        this.PLAYING = 0;
        this.FINISHED = 1;

        this.gravity = DEFAULT_GRAVITY;
        this.player = null;
        this.state = this.PLAYING;
        // The background sprite (TiledBackground)
        // this.compound = compound;
        // this.compound.zpos = Level.BACKGROUND_POS;
        // List of enemies, interactable objects etc and the player
        this.things = [];
        // The PIXI container for everything we want to draw
        this.stage = new PIXI.Container();
        this.stage.sortableChildren = true;

        // this.darkness = new LevelDarkness();
        // this.addThing(this.darkness);

        this.smoothTracking = true;
        this.exitDoor = null;

        function makeGrid(rows, cols, value=true) {
            return new Array(rows).fill(0).map(() => new Array(cols).fill(value));
        }
        function fillCircle(grid, row, col, radius, value) {
            for (let r = row-radius; r <= row+radius; r++) {
                for (let c = col-radius; c <= col+radius; c++) {
                    const dist = Math.sqrt((c-col)**2 + (r-row)**2);
                    if (Math.round(dist) <= radius && r >= 0 && r < grid.length && c >= 0 && c < grid[0].length) {
                        grid[r][c] = value;
                    }
                }
            }
        }

        const noise = new Noise(0);
        const rows = 50;
        const cols = 50;
        const dirtSheet = Resources.shared.find(RES.TILES_DIRT);
        const grassSheet = Resources.shared.find(RES.TILES_GRASS);
        const mountainSheet = Resources.shared.find(RES.TILES_MOUNTAIN);
        const cobbleSheet = Resources.shared.find(RES.TILES_COBBLESTONE);
        const terrain = makeGrid(rows, cols, true).map((rowData, row) => rowData.map((colData, col) => {
            return noise.simplex2(row/15, col/15) >= -0.3;
        }));
        const mountainTerrain = makeGrid(rows, cols, true).map((rowData, row) => rowData.map((colData, col) => {
            return noise.simplex2(row/15, col/15) >= 0.5;
        }));

        const roads = makeGrid(rows, cols, false);
        for (let n = 0; n < 5; n++) {
            let col = n === 0 ? 3 : Utils.randint(0, cols-1);
            let row = n === 0 ? 3 : Utils.randint(0, rows-1);
            let deltaRow = 1;
            let deltaCol = 0;
            for (let m = 0; m < 50; m++) {
                if (
                    terrain[row + deltaRow]?.[col + deltaCol] &&
                    !roads[row + deltaRow]?.[col + deltaCol] &&
                    !mountainTerrain[row + deltaRow]?.[col + deltaCol] &&
                    Utils.randint(0, 8)
                ) {
                    roads[row][col] = true;
                    col += deltaCol;
                    row += deltaRow;
                } else {
                    [deltaRow, deltaCol] = Utils.randomChoice([
                        [-1, 0],
                        [1, 0],
                        [0, -1],
                        [0, 1],
                    ]);
                }
            }
        }
        const stacked = new StackedGrid({
            bottomTileInfo: 'water',
            bottomLayerHeight: 0,
            autoUpdate: false, // we'll use our own ticker
            // debugGridColor: 0x505050,
            // debugDualGridColor: 0,
            // debugDualGridSubTileColor: 0xa0a0a0,
            layers: [
                {
                    tileInfo: 'dirt',
                    spritesheet: dirtSheet,
                    terrain: terrain,
                    height: 1,
                },
                {
                    tileInfo: 'grass',
                    spritesheet: grassSheet,
                    terrain: terrain,
                    height: 1,
                },
                {
                    tileInfo: 'cobble',
                    spritesheet: cobbleSheet,
                    terrain: roads,
                    height: 1,
                },
                {
                    tileInfo: 'mountain',
                    spritesheet: mountainSheet,
                    terrain: mountainTerrain,
                    height: 2,
                    hitMap: getHitMapFromTileSheet(Render.getRenderer(), mountainSheet),
                },
            ],
        });
        this.stage.addChild(stacked);
        this.grid = stacked;
        this.grid.viewport.width = Level.CAMERA_WIDTH;
        this.grid.viewport.height = Level.CAMERA_HEIGHT;
        this.groundStage.sortableChildren = true;
    }

    get groundStage() {
        return this.grid.foreground;
    }

    get tileWidth() {
        return this.grid.tileSize.width;
    }

    get tileHeight() {
        return this.grid.tileSize.height;
    }

    get basePos() {
        return this.player.basePos;
    }

    get baseSpeed() {
        return this.player.baseSpeed;
    }

    get viewport() {
        return this.grid.viewport;
    }

    isFinished() {
        return this.state === this.FINISHED;
    }

    destroy()
    {
        if (this.stage) {
            // Remove the player first, so they don't get destroyed
            // (reused in the next level)
            this.removeThing(this.player);
            this.stage.destroy({children: true});
            this.stage = null;
            this.things = null;
            this.player = null;
        }
    }

    getMousePos() {
        const mapx = this.player.controls.mouse.x + this.grid.viewport.x;
        const mapy = this.player.controls.mouse.y + this.grid.viewport.y;
        return {
            x: mapx,
            y: mapy,
        };
    }

    // Returns the width of the level in pixels (ie render size)
    get width()
    {
        return this.tileWidth * this.grid.cols;
    }

    // Returns the height of the level in pixels (ie render size)
    get height()
    {
        return this.tileHeight * this.grid.rows;
    }

    /* Find some clear space to spawn a thing at the given location. This code
     * looks up/down until it finds the first pixel of free space. Returns the
     * y-position of that free space. */
    findClearSpace(x, y)
    {
        return null;
        let offset = 0;
        while(true)
        {
            let north = this.compound.getTileAt(x, y + offset);
            let south = this.compound.getTileAt(x, y - offset);
            if (!north.solid) {
                return y + offset;
            }
            if (!south.solid) {
                return y - offset;
            }
            if (y + offset > this.compound.height && y - offset < 0) {
                // We've gone completely outside the level - no space found
                return null;
            }
            offset += TILE_HEIGHT;
        }
    }

    // Called every frame to update the general level state
    update(dt)
    {
        // TODO - this could be better optimized by despawning things that are
        // no longer visible. (ie blood spatters etc)

        // Update everything in the level
        for (let thing of this.things) {
            // TODO - only update things within camera view (+/- bounds)
            if (thing.update) thing.update(dt);
        }

        const xpos = this.player.x - this.grid.viewport.width/2;
        const ypos = this.player.y - this.grid.viewport.height/2;
        this.grid.viewport.x = xpos;
        this.grid.viewport.y = ypos;
        this.grid.update(dt);
    }

    /* Check if the given hitbox, at the given position, overlaps with any thing
     * in the level. Can also supply a thing to ignore when making the check.
     * This function is used to determine if a projectile strikes a target. */
    checkHit(x, y, hitbox, ignore)
    {
        const xp = x + hitbox.x
        const yp = y + hitbox.y;
        const w = hitbox.width;
        const h = hitbox.height;
        for (let thing of this.things)
        {
            if (thing !== ignore && thing.sprite &&
                thing.hitbox && thing.hitbox !== hitbox &&
                Math.abs(xp-thing.sprite.x-thing.hitbox.x) < (w+thing.hitbox.width)/2 &&
                Math.abs(yp-thing.sprite.y-thing.hitbox.y) < (h+thing.hitbox.height)/2)
            {
                return thing;
            }
        }
        return null;
    }

    /* Iterates over all things in this level, and calls the given function
     * for each thing that overlaps with the given hitbox. */
    forEachThingHit(x, y, hitbox, ignore, callback)
    {
        const xp = x + hitbox.x;
        const yp = y + hitbox.y;
        const w = hitbox.width;
        const h = hitbox.height;
        for (let thing of this.things)
        {
            if (thing !== ignore && thing.sprite &&
                thing.hitbox && thing.hitbox !== hitbox &&
                Math.abs(xp-thing.sprite.x-thing.hitbox.x) < (w+thing.hitbox.width)/2 &&
                Math.abs(yp-thing.sprite.y-thing.hitbox.y) < (h+thing.hitbox.height)/2)
            {
                callback(thing);
            }
        }
    }

    getThingAt(x, y, filterFunc) {
        const thing = this.things.find(thing => {
            const bounds = thing.sprite.getLocalBounds();
            return (
                (!filterFunc || filterFunc(thing)) &&
                x >= thing.sprite.x + bounds.minX &&
                x <= thing.sprite.x + bounds.maxX &&
                y >= thing.sprite.y + bounds.minY &&
                y <= thing.sprite.y + bounds.maxY
            );
        });
        return thing ?? null;
    }

    checkSolidAt(x, y, width)
    {
        return x < 0 || y < 0 || x >= this.width || y >= this.height;
        // let left = this.compound.getTileAt(x-width/2, y);
        // let right = this.compound.getTileAt(x+width/2, y);
        // return left.solid || right.solid;
    }

    // Add a 'thing' to the level and it's sprite to the render stage
    addThing(thing, x, y)
    {
        thing.level = this;
        this.things.push(thing);
        if (thing.sprite) {
            this.groundStage.addChild(thing.sprite);
        }
        if (x !== undefined) thing.fx = x;
        if (y !== undefined) thing.fy = y;
    }

    // Remove a 'thing' remove the level and it's sprite from the stage
    removeThing(thing)
    {
        if (!thing) {
            return;
        }
        let i = this.things.indexOf(thing);
        if (i >= 0) {
            this.things[i] = this.things[this.things.length-1];
            this.things.pop();
            thing.level = null;
        }

        if (thing.sprite && thing.sprite.parent) {
            thing.sprite.parent.removeChild(thing.sprite);
        }
    }

    getTileAt(x, y) {
        const cell = this.grid.getCellAt(x, y);
        return {
            type: cell?.tileInfo,
        };
    }

    getHeightAt(x, y) {
        return this.grid.getHeightAt(x, y);
    }

    isThingVisible(thing) {
        return this.grid.viewport.contains(thing.x, thing.y);
    }
}

Level.BEHIND_BACKGROUND_POS = -1;
Level.BACKGROUND_POS = 0;
Level.FLOOR_POS = 1;
Level.ON_FLOOR_POS = 2;
Level.FRONT_POS = 10000;
Level.ROW_DEPTH = 5;

Level.CAMERA_WIDTH = 100;
Level.CAMERA_HEIGHT = 60;
