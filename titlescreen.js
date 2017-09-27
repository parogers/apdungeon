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

function TitleScreen()
{
    // Playing through the intro sequence (looping)
    this.PLAYING_INTRO = 1;
    // Player wants to start a new game
    this.NEW_GAME = 2;

    // The (native) height of the title screen before scaling
    var screenHeight = 80;
    // Calculate the native-to-screen scaling so that the title screen fits
    // the available vertical space.
    var scale = Render.getRenderer().height/screenHeight;

    // Now figure out how wide the screen is (to fill the space)
    var screenWidth = Render.getRenderer().width/scale;

    // The PIXI container for rendering the scene
    this.stage = new PIXI.Container();
    this.stage.scale.set(scale);
    this.state = this.PLAYING_INTRO;

    this.bg = new PIXI.Sprite(getFrame(RES.UI, "brown3"));
    this.bg.anchor.set(0, 0);
    this.bg.scale.set(
	screenWidth/this.bg.texture.width,
	screenHeight/this.bg.texture.height);
    this.stage.addChild(this.bg);
    this.delay = 0;

    txt = new PIXI.Sprite(getFrame(RES.UI, "title-text"));
    txt.anchor.set(0.5, 0.5);
    txt.tint = 0xFF0000;
    //txt.x = getRenderer().width/2;
    txt.x = screenWidth/2;
    txt.y = screenHeight/5;
    this.stage.addChild(txt);

    txt = new PIXI.Sprite(getFrame(RES.UI, "demo-text"));
    txt.anchor.set(0.5, 0.5);
    txt.tint = 0xFF0000;
    //txt.x = getRenderer().width/2;
    txt.x = screenWidth/2;
    txt.y = screenHeight/5+15;
    this.stage.addChild(txt);

    txt = new PIXI.Sprite(renderText("PRESS SPACE TO PLAY"));
    txt.scale.set(0.75);
    txt.anchor.set(0.5, 0.5);
    txt.tint = 0xFF0000;
    txt.x = screenWidth/2; //getRenderer().width/2;
    txt.y = 6*screenHeight/7; //getRenderer().height-50;
    this.stage.addChild(txt);

    this.sequence = new Sequence(
	{
	    stage: this.stage,
	    level: null,
	    player: null
	},
	"start",
	function(dt) {
	    this.level = LevelGenerator.generateEmpty(3, 20, "smooth_floor_m");
	    this.level.stage.x = -10;
	    this.level.stage.y = screenHeight/2-5;
	    this.stage.addChild(this.level.stage);
	    // Note the screen position within the level (so we can know when
	    // objects are offscreen)
	    this.screenLeft = -this.level.stage.x;
	    this.screenRight = this.screenLeft + screenWidth;
	    // Create a dummy player to drive around
	    this.player = new Player();
	    this.player.cameraMovement = false;
	    this.player.hasControl = false;
	    this.player.sprite.x = 2;
	    this.player.sprite.y = 20;
	    this.level.addThing(this.player);

	    this.monster = new Scenery(getFrames(RES.ENEMIES, RAT_FRAMES));
	    this.monster.sprite.y = this.player.sprite.y;
	    this.level.addThing(this.monster);

	    this.monsterChoices = [
		RAT_FRAMES,
		SNAKE_FRAMES,
		SCORPION_FRAMES,
		SKEL_WARRIOR_FRAMES,
		GOBLIN_FRAMES,
		GHOST_FRAMES]
	    this.monsterChoice = 0;

	    return this.NEXT;
	},
	function(dt) {
	    // Have the player run right offscreen
	    this.player.dirx = 1;
	    this.player.update(dt);
	    if (this.player.sprite.x > this.screenRight+4) {
		this.monster.sprite.x = this.screenRight+16;
		return this.NEXT;
	    }
	},
	"loop",
	function(dt) {
	    // Have the player run the other way chased by a monster
	    this.player.dirx = -1;
	    this.player.update(dt);
	    this.monster.velx = -20;
	    this.monster.update(dt);
	    this.monster.faceDirection(-1);
	    if (this.player.sprite.x < this.screenLeft-4) {
		this.player.upgradeSword(Item.SMALL_SWORD);
		return this.NEXT;
	    }
	},
	function(dt) {
	    // Now the player chases the monster with a sword
	    this.player.dirx = 1;
	    this.player.update(dt);
	    this.monster.velx = 20;
	    this.monster.update(dt);
	    this.monster.faceDirection(1);
	    if (this.player.sprite.x > this.screenRight+4) {
		// New monster chases the player
		this.monsterChoice++;
		var choice = this.monsterChoices[
		    this.monsterChoice%this.monsterChoices.length];
		this.monster.frames = getFrames(RES.ENEMIES, choice);
		return "loop";
	    }
	}
    );

}

TitleScreen.prototype.update = function(dt)
{
    if (this.delay > 0) {
	this.delay -= dt;
	return;
    }

    this.sequence.update(dt);

    if (controls.space) {
	this.state = this.NEW_GAME;
    }
}

TitleScreen.prototype.render = function()
{
    Render.getRenderer().render(this.stage);
}
