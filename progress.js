function ProgressBar(width, height, text)
{
    this.width = width;
    this.height = height;
    this.current = 0;
    //this.text = null;
    this.sprite = new PIXI.Container();
    this.barSprite = new PIXI.Sprite();
    this.textSprite = new PIXI.Text(
	text, {fontFamily: 'Courier New', 
	       fontSize: 20, 
	       fill: 0xffffff,
	       fontWeight: 'bold',
	       align: 'center'});
    this.textSprite.y = height+5;
    //this.textSprite.scale.y = 0.5;
    this.sprite.addChild(this.barSprite);
    this.sprite.addChild(this.textSprite);
}

ProgressBar.prototype.setText = function(text)
{
    this.textSprite.text = text;
}

ProgressBar.prototype.update = function(value)
{
    this.current = value;
    var canvas = document.createElement("canvas");
    canvas.width = this.width;
    canvas.height = this.height;

    var ctx = canvas.getContext("2d");
    ctx.fillStyle = "#ddd";
    ctx.fillRect(0, 0, this.width*this.current, this.height);
    ctx.strokeStyle = "#f00";
    ctx.strokeRect(0, 0, this.width, this.height);

    this.barSprite.texture = PIXI.Texture.fromCanvas(canvas);
}
