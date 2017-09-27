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

/* Displays a game over screen. The LevelScreen that caused the game over
 * should be passed in. This screen will make a gradual transition from 
 * the level scene to a general game over screen, showing stats etc */
function GameOverScreen(levelScreen)
{
    // The various states we can be in:
    // Making a transition between the level and a black screen
    this.TRANSITION_TO_GAMEOVER = 1;
    // Showing the kill counts
    this.SHOWING_KILLS = 2;
    // Show message asking player to press a key
    this.SHOW_CONTINUE_TEXT = 3;
    // Waiting for user to press a key
    this.WAITING = 4;
    // Done showing the game over screen
    this.DONE = 5;

    this.levelScreen = levelScreen;
    this.state = this.TRANSITION_TO_GAMEOVER;

    this.stage = new PIXI.Container();
    this.stage.addChild(levelScreen.stage);

    // Create a black sprite that covers the screen
    this.bg = new PIXI.Sprite(getFrame(RES.UI, "black"));
    this.bg.anchor.set(0, 0);
    this.bg.scale.set(getRenderer().width/this.bg.texture.width,
		      getRenderer().height/this.bg.texture.height);
    this.bg.alpha = 0;
    this.timer = 0;
    this.delay = 0.25;

    // Build a list of kill stats, in sorted order
    this.row = 0;
    this.col = 0;
    this.killStats = [];
    var names = Object.keys(levelScreen.player.kills);
    for (name of names) {
	var stat = levelScreen.player.kills[name];
	this.killStats.push({
	    count: stat.count,
	    img: stat.img,
	    name: name
	});
    }

    this.stage.addChild(this.bg);
}

GameOverScreen.prototype.update = function(dt)
{
    if (this.delay > 0) {
	this.delay -= dt;
	return;
    }

    switch(this.state) {
    case this.TRANSITION_TO_GAMEOVER:
	// Transitioning from the level to a blank screen. The curve here is
	// chosen so that the fade starts out quickly, then slows down as it
	// approaches full black.
	this.timer += dt;
	this.bg.alpha = Math.pow(this.timer/1.25, 0.5);
	if (this.bg.alpha > 1) 
	{
	    // Background is now fully black. Show the game over text
	    this.bg.alpha = 1;
	    var txt = new PIXI.Sprite(getFrame(RES.UI, "game-over-text"));
	    txt.anchor.set(0.5, 0.5);
	    txt.scale.set(SCALE);
	    txt.x = getRenderer().width/2;
	    txt.y = 60;
	    this.stage.addChild(txt);
	    this.state = this.SHOWING_KILLS;
	    this.delay = 0.75;
	}
	break;

    case this.SHOWING_KILLS:
	while (this.killStats.length > 0) {
	    // Show the next killed monster
	    var xpos = 50+this.col*getRenderer().width/2;
	    var ypos = 150+this.row*55;
	    var stat = this.killStats.shift();
	    var monster = new PIXI.Sprite(stat.img);
	    monster.scale.set(SCALE);
	    monster.anchor.set(0.5, 1);
	    monster.x = xpos;
	    monster.y = ypos;
	    this.stage.addChild(monster);

	    // Show the name
	    var msg = stat.name.toUpperCase() + " *" + stat.count;
	    var txt = new PIXI.Sprite(renderText(msg));
	    txt.x = xpos + 40;
	    txt.y = ypos;
	    txt.anchor.set(0,1);
	    txt.scale.set(SCALE*0.65);
	    this.stage.addChild(txt);

	    this.col++;
	    if (this.col > 1) {
		this.row++;
		this.col = 0;
	    }
	}
	this.state = this.SHOW_CONTINUE_TEXT;
	this.delay = 1;
	break;

    case this.SHOW_CONTINUE_TEXT:
	var txt = new PIXI.Sprite(renderText("PRESS SPACE TO CONTINUE"));
	txt.scale.set(SCALE);
	txt.anchor.set(0.5, 0.5);
	txt.x = getRenderer().width/2;
	txt.y = getRenderer().height-50;
	this.stage.addChild(txt);
	this.state = this.WAITING;
	break;

    case this.WAITING:
	if (controls.space) {
	    this.state = this.DONE;
	}
	break;
    }
}

GameOverScreen.prototype.render = function()
{
    getRenderer().render(this.stage);
}
