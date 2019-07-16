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

import { Render } from './render';
import { Utils } from './utils';

export class Tile
{
    constructor(name, solid, wall)
    {
        this.name = name;
        this.solid = solid;
        this.wall = false;
    }
}

export class Tileset
{
    constructor()
    {
        var wall = new Tile("wall", true, true);
        var floor = new Tile("floor", false, false);
        var water = new Tile("water", false, false);
        water.water = true;
        this.tiles = {
            "smooth_floor_m" : floor,
            "smooth_wall_m" : wall,
            "water" : water
        };
        this.wall = wall;
    }

    getTile(name)
    {
        return this.tiles[name] || this.wall;
    }
};

export class Chunk
{
    constructor(tileWidth, tileHeight, wallHeight, textures, grid)
    {
        this.grid = grid;
        this.tileWidth = tileWidth;
        this.tileHeight = tileHeight;
        this.wallHeight = wallHeight;
        /* Create a texture large enough to hold all the tiles, plus a little 
         * extra for the first row, in case it contains wall tiles. (taller) */
        this.texture = PIXI.RenderTexture.create(
            grid[0].length*tileWidth, 
            (grid.length-1)*tileHeight + wallHeight);
        var cnt = new PIXI.Container();
        for (var row = 0; row < grid.length; row++) 
        {
            for (var col = 0; col < grid[0].length; col++) 
            {
                var sprite = new PIXI.Sprite(textures[grid[row][col]]);
                sprite.anchor.set(0,1);
                sprite.x = col*tileWidth;
                sprite.y = wallHeight + row*tileHeight;
                //(row+1)*tileHeight-(sprite.texture.height-tileHeight);
                cnt.addChild(sprite);
            }
        }
        cnt.x = 0;
        cnt.y = 0;
        Render.getRenderer().render(cnt, this.texture);
    }
};

export class TiledBackground
{
    constructor(chunk)
    {
        this.tileset = new Tileset();
        this.chunk = chunk;
        this.grid = chunk.grid;
        this.tileWidth = chunk.tileWidth;
        this.tileHeight = chunk.tileHeight;
        this.wallHeight = chunk.wallHeight;
        this.sprite = new PIXI.Sprite();
        this.sprite.texture = chunk.texture;
        this.sprite.x = 0;
        this.sprite.y = 0;
    }

    containsX(x) {
        return x >= this.sprite.x && x < this.sprite.x + this.sprite.width;
    }

    getWallTile() {
        return this.tileset.wall;
    }

    getTileAt(x, y)
    {
        // Account for the background offset, and also for the fact that the
        // first row of tiles are wall tiles. (ie taller)
        var x = x-this.sprite.x;
        var y = y-this.sprite.y-(this.wallHeight-this.tileHeight);

        var row = (y / this.tileHeight)|0;
        var col = (x / this.tileWidth)|0;
        if (this.grid[row])
            //return this.tileset.getTile(this.grid[row][col]);
            return this.tileset.tiles[this.grid[row][col]] || this.tileset.wall;

        return this.tileset.wall;
    }

    getX() {
        return this.sprite.x;
    }

    getY() {
        return this.sprite.y;
    }

    getWidth() {
        return this.sprite.width;
    }

    getHeight() {
        return this.sprite.height;
    }

    addToLevel(level)
    {
        level.stage.addChild(this.sprite);
    }

    // Make a shallow copy of this TiledBackground (creates a new sprite instance,
    // but shares the same texture and grid)
    copy()
    {
        let bg = new TiledBackground(
            this.tileWidth,
            this.tileHeight,
            {
                wallHeight: this.wallHeight,
                grid: this.grid,
                texture: this.sprite.texture,
            }
        );

        return bg;
    }
};

export class CompoundBackground
{
    constructor()
    {
        this.bgList = [];
        this.width = 0;
        this.height = 0;
        this.onSizeChanged = null;
    }

    updateLayout()
    {
        this.width = 0;
        this.height = 0;

        for (let bg of this.bgList) {
            bg.sprite.x = this.width;
            this.width += bg.getWidth();
            this.height = Math.max(this.height, bg.getHeight());
        }
        if (this.onSizeChanged)
        {
            this.onSizeChanged();
        }
    }

    appendBackground(bg)
    {
        this.bgList.push(bg);
        this.updateLayout();

        // Update our size whenever a child background changes size
        bg.onSizeChanged = () => {
            this.updateLayout();
        };
    }

    getWidth() {
        return this.width;
    }

    getHeight() {
        return this.height;
    }

    getTileAt(x, y)
    {
        if (this.bgList.length === 0) {
            return null;
        }
        // Use binary search to figure out which TiledBackground contains
        // the coordinates.
        let start = 0;
        let end = this.bgList.length-1;

        while (start <= end)
        {
            let mid = Math.floor((start + end) / 2);
            let bg = this.bgList[mid];

            if (bg.containsX(x)) {
                // Found it
                return bg.getTileAt(x, y);
            }
            if (x >= bg.getX()) {
                start = mid+1;
            } else {
                end = mid-1;
            }
        }
        return this.bgList[0].getWallTile();
    }

    addToLevel(level)
    {
        for (let bg of this.bgList) {
            bg.addToLevel(level);
        }
    }
};

