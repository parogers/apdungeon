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

import { Render } from './render';
import { Utils } from './utils';
import { Resources, RES } from './res';
import { Door, EnterScene } from './door';

function getTileset()
{
    const data = Resources.shared.find(RES.TILESET);
    return new Tileset(
        data.tile_width,
        data.tile_height,
        data.tiles
    );
}

export class Tile
{
    constructor(id, type, args)
    {
        this.id = id;
        this.type = type;
        this.solid = args.solid || false;
    }

    get isWater() {
        return this.type === 'water';
    }
};

export class Tileset
{
    constructor(tileWidth, tileHeight, tiles)
    {
        this.wall = new Tile('wall', 999, { solid: true });
        this.tiles = {};
        for (let tileID in tiles)
        {
            this.tiles[tileID] = new Tile(
                tileID,
                tiles[tileID].type,
                { solid: tiles[tileID].solid },
            );
        }

        this.tileWidth = tileWidth;
        this.tileHeight = tileHeight;
    }

    getTexture(name)
    {
        let textures = Resources.shared.getTextures(RES.MAPTILES);
        let texture = textures['' + name];

        if (!texture) {
            throw Error('cannot find texture ' + name);
        }
        return texture;
    }
};

export class ChunkTemplate
{
    constructor(background, midground, things)
    {
        this.grid = background;
        this.midground = midground;
        this.things = things;
        this.texture = null;
    }

    renderTexture()
    {
        if (this.texture !== null) {
            return this.texture;
        }

        let tileset = getTileset();
        this.texture = PIXI.RenderTexture.create({
            width: this.grid[0].length*tileset.tileWidth,
            height: this.grid.length*tileset.tileHeight
        });

        let cnt = new PIXI.Container();
        for (let row = 0; row < this.grid.length; row++)
        {
            for (let col = 0; col < this.grid[0].length; col++)
            {
                let tileID = this.grid[row][col];
                let sprite = new PIXI.Sprite(
                    tileset.getTexture(tileID)
                );
                sprite.anchor.set(0,1);
                sprite.x = col*tileset.tileWidth;
                sprite.y = (row+1)*tileset.tileHeight;
                cnt.addChild(sprite);
            }
        }
        cnt.x = 0;
        cnt.y = 0;
        Render.getRenderer().render(cnt, {
            renderTexture: this.texture
        });
        return this.texture;
    }

    // Spawn any things defined by this template into the given chunk
    spawnThings(chunk)
    {
        let level = chunk.compound.level;
        for (let obj of this.things)
        {
            if (obj.name == 'start')
            {
                let x = obj.x - chunk.tileset.tileWidth/2;
                let y = obj.y - chunk.tileset.tileHeight/2;

                // Add a door to enter the level
                let door = new Door();
                door.sprite.x = x + door.sprite.anchor.x * door.sprite.texture.width;
                door.sprite.y = y + door.sprite.anchor.y * door.sprite.texture.height;
                level.addThing(door);
                level.addThing(new EnterScene(door));
            }
        }
    }
};

export class Chunk
{
    constructor(template)
    {
        this.tileset = getTileset();
        this.template = template;
        this.grid = template.grid;
        this.sprite = new PIXI.Sprite();
        this.sprite.texture = template.renderTexture();
        this.sprite.x = 0;
        this.sprite.y = 0;
        // Whether this chunk has spawned things are not
        this.spawned = false;
        this.compound = null;
    }

    spawnThings()
    {
        if (!this.spawned) {
            this.template.spawnThings(this);
            this.spawned = true;
        }
    }

    containsX(x) {
        return x >= this.sprite.x && x < this.sprite.x + this.sprite.width;
    }

    get wallTile() {
        return this.tileset.wall;
    }

    getTileAt(x, y)
    {
        // Account for the background offset, and also for the fact that the
        // first row of tiles are wall tiles. (ie taller)
        x -= this.sprite.x;
        y -= this.sprite.y;

        let row = (y / this.tileHeight)|0;
        let col = (x / this.tileWidth)|0;
        if (this.grid[row] && this.grid[row][col]) {
            return this.tileset.tiles[this.grid[row][col]];
        }
        return this.tileset.wall;
    }

    get x() {
        return this.sprite.x;
    }

    get y() {
        return this.sprite.y;
    }

    get width() {
        return this.sprite.width;
    }

    get height() {
        return this.sprite.height;
    }

    get tileWidth() {
        return this.tileset.tileWidth;
    }

    get tileHeight() {
        return this.tileset.tileHeight;
    }

    addToLevel(level)
    {
        level.stage.addChild(this.sprite);
    }
};

export class Compound
{
    constructor()
    {
        this.chunks = [];
        this.width = 0;
        this.height = 0;
        this.level = null;
    }

    get tileWidth() {
        return this.chunks[0].tileWidth;
    }

    get tileHeight() {
        return this.chunks[0].tileHeight;
    }

    addChunk(chunk)
    {
        chunk.compound = this;
        this.chunks.push(chunk);
        // Update the tiled grid layout to make sure everything lines up
        this.width = 0;
        this.height = 0;
        for (let chunk of this.chunks) {
            chunk.sprite.x = this.width;
            this.width += chunk.width;
            this.height = Math.max(this.height, chunk.height);
        }
    }

    getTileAt(x, y)
    {
        if (this.chunks.length === 0) {
            return null;
        }
        // Use binary search to figure out which Chunk contains the coordinates
        let start = 0;
        let end = this.chunks.length-1;

        while (start <= end)
        {
            let mid = Math.floor((start + end) / 2);
            let chunk = this.chunks[mid];

            if (chunk.containsX(x)) {
                return chunk.getTileAt(x, y);
            }
            if (x >= chunk.x) {
                start = mid+1;
            } else {
                end = mid-1;
            }
        }
        return this.chunks[0].wallTile;
    }

    addToLevel(level)
    {
        this.level = level;
        for (let chunk of this.chunks) {
            chunk.addToLevel(level);
        }
    }
};
