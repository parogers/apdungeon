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

import { RES, TILE_WIDTH } from './res';
import { Utils, Sequence } from './utils';
import { Render } from './render';
import { renderText } from './ui';
import { GameControls, ManualControls } from './controls';
import { generateEmptyLevel } from './genlevel';
import { Player } from './player';
import { Item } from './item';
import { Scenery } from './scenery';
import { SnakeLike } from './snake';
import { Goblin } from './goblin';
import { SkelWarrior } from './skel_warrior';
import { Ghost } from './ghost';
import { LevelScreen } from './levelscreen';
import { Snake, Rat, Scorpion } from './snake';

/***************/
/* TitleScreen */
/***************/

export class TitleScreen
{
    constructor()
    {
        // Playing through the intro sequence (looping)
        this.PLAYING_INTRO = 1;
        // Player wants to start a new game
        this.NEW_GAME = 2;

        // The (native) height of the title screen before scaling
        this.screenHeight = 80;
        this.screenWidth = Math.round(
            LevelScreen.getAspectRatio()*this.screenHeight);
        // Calculate the native-to-screen scaling so that the title screen fits
        // the available vertical space.
        let scale = Render.getRenderer().height/this.screenHeight;

        // Now figure out how wide the screen is (to fill the space)
        //let screenWidth = Render.getRenderer().width/scale;

        // The PIXI container for rendering the scene
        this.stage = new PIXI.Container();
        this.stage.scale.set(scale);
        this.state = this.PLAYING_INTRO;

        this.bg = new PIXI.Sprite(Utils.getFrame(RES.UI, 'brown3'));
        this.bg.anchor.set(0, 0);
        this.bg.scale.set(
            this.screenWidth/this.bg.texture.width+1,
            this.screenHeight/this.bg.texture.height+1);
        this.stage.addChild(this.bg);
        this.delay = 0;

        let txt = new PIXI.Sprite(Utils.getFrame(RES.UI, 'title-text'));
        txt.anchor.set(0.5, 0.5);
        txt.tint = 0xFF0000;
        txt.x = this.screenWidth/2;
        txt.y = 15;
        this.stage.addChild(txt);

        txt = new PIXI.Sprite(Utils.getFrame(RES.UI, 'demo-text'));
        txt.anchor.set(0.5, 0.5);
        txt.tint = 0xFF0000;
        txt.x = this.screenWidth/2;
        txt.y = 25;
        this.stage.addChild(txt);

        txt = new PIXI.Sprite(renderText('TAP TO PLAY'));
        //txt = new PIXI.Sprite(renderText('CLICK OR PRESS SPACE TO PLAY'));
        txt.scale.set(0.75);
        txt.anchor.set(0.5, 0.5);
        txt.tint = 0xFF0000;
        txt.x = this.screenWidth/2;
        txt.y = 35;
        this.stage.addChild(txt);

        txt = new PIXI.Sprite(renderText('PROGRAMMING BY PETER ROGERS. ARTWORK IS PUBLIC DOMAIN.'));
        txt.scale.set(0.55);
        txt.anchor.set(0.5, 0.5);
        txt.tint = 0xFF0000;
        txt.x = this.screenWidth/2;
        txt.y = 70;
        this.stage.addChild(txt);

        txt = new PIXI.Sprite(renderText(
            'MUSIC \"A JOURNEY AWAITS\" BY PIERRA BONDOERFFER @PBONDOER'));
        txt.scale.set(0.55);
        txt.anchor.set(0.5, 0.5);
        txt.tint = 0xFF0000;
        txt.x = this.screenWidth/2;
        txt.y = 75;
        this.stage.addChild(txt);

        // Add event handlers for mouse clicks and screen touches. We cache the
        // event handlers here so they can be removed later.
        this.mouseClicked = false;
        this.touchClicked = false;
        this.onMouseUp = (evt) => {
            //this.mouseClicked = true;
        };
        this.onTouchEnd = (evt) => {
            //this.touchClicked = true;
        }
        Render.getContainer().addEventListener('mouseup', this.onMouseUp);
        Render.getContainer().addEventListener('touchend', this.onTouchEnd);

        return;

        this.sequence = new Sequence(
            {
                stage: this.stage,
                level: null,
                player: null,
                screenWidth: this.screenWidth,
                screenHeight: this.screenHeight
            },
            'start',
            function(dt) {
                this.level = generateEmptyLevel(
                    2, Math.round(this.screenWidth/TILE_WIDTH)+4,
                    '1'); // floor tile
                this.level.stage.x = -TILE_WIDTH*2;
                this.level.stage.y = 44;
                //this.level.camera.x = TILE_WIDTH*2;
                this.level.camera.width = this.level.getWidth();
                this.stage.addChild(this.level.stage);
                // Note the screen position within the level (so we can know when
                // objects are offscreen)
                this.screenLeft = -this.level.stage.x;
                this.screenRight = this.screenLeft + this.screenWidth;
                // Create a dummy player to drive around
                this.controls = new ManualControls();
                this.player = new Player(this.controls);
                this.player.sprite.x = 2;
                this.player.sprite.y = 12;
                this.level.addThing(this.player);

                this.monsterChoices = [
                    Rat.FRAMES,
                    Snake.FRAMES,
                    Scorpion.FRAMES,
                    SkelWarrior.FRAMES,
                    Goblin.FRAMES,
                    Ghost.FRAMES]
                this.monsterChoice = 0;

                this.monster = new Scenery(
                    Utils.getFrames(RES.ENEMIES, this.monsterChoices[0]));
                this.monster.sprite.y = this.player.sprite.y;
                this.level.addThing(this.monster);

                return this.NEXT;
            },
            function(dt) {
                // Have the player run right offscreen
                this.controls.dirx = 1;
                this.player.update(dt);
                if (this.player.sprite.x > this.screenRight+4) {
                    this.monster.sprite.x = this.screenRight+16;
                    return this.NEXT;
                }
            },
            'loop',
            function(dt) {
                // Have the player run the other way chased by a monster
                this.controls.dirx = -1;
                this.player.update(dt);
                this.monster.velx = -20;
                this.monster.update(dt);
                this.monster.facing = -1;
                if (this.player.sprite.x < this.screenLeft-4) {
                    this.player.upgradeSword(Item.Table.SMALL_SWORD);
                    return this.NEXT;
                }
            },
            function(dt) {
                // Now the player chases the monster with a sword
                this.controls.dirx = 1;
                this.player.update(dt);
                this.monster.velx = 20;
                this.monster.update(dt);
                this.monster.facing = 1;
                if (this.player.sprite.x > this.screenRight+4) {
                    // New monster chases the player
                    this.monsterChoice++;
                    let choice = this.monsterChoices[
                        this.monsterChoice%this.monsterChoices.length];
                    this.monster.frames = Utils.getFrames(RES.ENEMIES, choice);
                    return 'loop';
                }
            }
        );
    }

    destroy()
    {
        Render.getContainer().removeEventListener('mouseup', this.onMouseUp);
        Render.getContainer().removeEventListener('touchend', this.onTouchEnd);
    }

    update(dt)
    {
        if (this.delay > 0) {
            this.delay -= dt;
            return;
        }

        if (this.sequence) {
            this.sequence.update(dt);
        }

        if (GameControls.getControls().space.released ||
            this.mouseClicked || this.touchClicked) {
            this.state = this.NEW_GAME;
        }
    }

    render()
    {
        Render.getRenderer().render(this.stage);
    }

    handleGesture(gesture)
    {
        // Wait for the player to tap the screen before starting
        if (gesture.tap) {
            this.mouseClicked = true;
        }
    }

    handleResize()
    {
        if (this.stage) {
            let scale = Math.min(
                Render.getRenderer().width / this.screenWidth,
                Render.getRenderer().height / this.screenHeight);
            this.stage.scale.set(scale);
        }
    }
}
