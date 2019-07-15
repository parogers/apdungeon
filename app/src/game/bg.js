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

export function Tile(name, solid, wall)
{
    this.name = name;
    this.solid = solid;
    this.wall = false;
}

function Tileset()
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

Tileset.prototype.getTile = function(name)
{
    return this.tiles[name] || this.wall;
}

export function TiledBackground(tileWidth, tileHeight, wallHeight, textures, grid)
{
    /* Create a texture large enough to hold all the tiles, plus a little extra
     * for the first row, in case it contains wall tiles. (taller) */
    var renderTexture = PIXI.RenderTexture.create(
        grid[0].length*tileWidth, 
        (grid.length-1)*tileHeight + wallHeight);
    var cnt = new PIXI.Container();
    this.solid = Utils.createGrid(grid.rows, grid.cols);
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
            this.solid[row][col] = (grid[row][col] !== "smooth_floor_m");
        }
    }
    cnt.x = 0;
    cnt.y = 0;
    Render.getRenderer().render(cnt, renderTexture);

    this.tileset = new Tileset();
    this.grid = grid;
    this.tileWidth = tileWidth;
    this.tileHeight = tileHeight;
    this.wallHeight = wallHeight;
    this.sprite = new PIXI.Sprite();
    this.sprite.texture = renderTexture;
    this.sprite.x = 0;
    this.sprite.y = 0;
    //this.sprite.scale.set(1.8);
}

TiledBackground.prototype.getTileAt = function(x, y)
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

TiledBackground.prototype.getHeight = function()
{
    return this.sprite.texture.height;
}