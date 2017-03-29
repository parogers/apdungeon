function Tile(name, solid)
{
    this.name = name;
    this.solid = solid;
}

function Tileset()
{
    var wall = new Tile("wall", true);
    var floor = new Tile("floor", false);
    var water = new Tile("water", false);
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

function TiledBackground(tileWidth, tileHeight, textures, grid)
{
    /* Create a texture large enough to hold all the tiles, plus a little extra
     * for the first row, in case it contains wall tiles. (taller) */
    var renderTexture = PIXI.RenderTexture.create(
	grid[0].length*tileWidth, 
	(grid.length+1)*tileHeight);
    var cnt = new PIXI.Container();
    this.solid = createGrid(grid.rows, grid.cols);
    for (var row = 0; row < grid.length; row++) 
    {
	for (var col = 0; col < grid[0].length; col++) 
	{
	    var sprite = new PIXI.Sprite(textures[grid[row][col]]);
	    sprite.x = col*tileWidth;
	    sprite.y = (row+1)*tileHeight-(sprite.texture.height-tileHeight);
	    cnt.addChild(sprite);
	    this.solid[row][col] = (grid[row][col] !== "smooth_floor_m");
	}
    }
    cnt.x = 0;
    cnt.y = 0;
    renderer.render(cnt, renderTexture);

    this.grid = grid;
    this.tileWidth = tileWidth*SCALE;
    this.tileHeight = tileHeight*SCALE;
    this.sprite = new PIXI.Sprite();
    this.sprite.texture = renderTexture;
    this.sprite.x = 0;
    this.sprite.y = 0;
    this.sprite.scale.set(SCALE);
    //this.sprite.scale.set(1.8);
}

TiledBackground.prototype.checkHit = function(x, y, w)
{
    return false;
    var x = x-this.sprite.x;
    var y = y-(this.sprite.y+this.tileHeight);
    if (x < 0 || x > this.sprite.texture.width*SCALE ||
	y < 0 || y > this.sprite.texture.height*SCALE - this.tileHeight) 
    {
	return true;
    }
    var row = (y / this.tileHeight)|0;
    var col1 = (x / this.tileWidth)|0;
    var col2 = ((x+w) / this.tileWidth)|0;
    for (var col = col1; col <= col2; col++)
	if (this.solid[row] && this.solid[row][col])
	    return true;
    return false;
}

TiledBackground.prototype.getTileAt = function(x, y)
{
    var x = x-this.sprite.x;
    var y = y-(this.sprite.y+this.tileHeight);
    /*if (x < 0 || x > this.sprite.texture.width*SCALE ||
	y < 0 || y > this.sprite.texture.height*SCALE - this.tileHeight) 
    {
	return null;
    }*/
    var row = (y / this.tileHeight)|0;
    var col = (x / this.tileWidth)|0;
    if (this.grid[row] && this.grid[row][col])
	return tileset.getTile(this.grid[row][col]);
    return tileset.wall;
}
