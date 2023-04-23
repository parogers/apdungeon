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

import { Resources, RES, TILE_WIDTH } from './res';
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

        this.bg = new PIXI.Sprite(Resources.shared.getFrame(RES.UI, 'brown3'));
        this.bg.anchor.set(0, 0);
        this.bg.scale.set(
            this.screenWidth/this.bg.texture.width+1,
            this.screenHeight/this.bg.texture.height+1);
        this.stage.addChild(this.bg);
        this.delay = 0;

        let txt = new PIXI.Sprite(Resources.shared.getFrame(RES.UI, 'title-text'));
        txt.anchor.set(0.5, 0.5);
        txt.tint = 0xFF0000;
        txt.x = this.screenWidth/2;
        txt.y = 15;
        this.stage.addChild(txt);

        txt = new PIXI.Sprite(Resources.shared.getFrame(RES.UI, 'demo-text'));
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
    }

    destroy() {}

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
