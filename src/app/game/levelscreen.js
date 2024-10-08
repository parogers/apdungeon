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
import { GameUI } from './ui';
import { generateLevel } from './genlevel';
import { GoMarker } from './gomarker';
import { Player } from './player';
import { Level } from './level';
import { Utils } from './utils';
import { GameControls } from './controls';
import { Audio } from './audio';

class TouchControls
{
    constructor() {
        // Gestures on the left and right side of the screen respectively.
        // Once set these are held for a single frame and then discarded.
        // (so the player object has a single frame to handle the gesture
        // via player.update)
        this.leftGesture = null;
        this.rightGesture = null;
    }

    reset() {
        // Discard any gestures since they (should) have been handled above
        this.leftGesture = null;
        this.rightGesture = null;
    }

    handleGesture(gesture)
    {
        // Decide what side of the screen the gesture belongs to
        if (gesture.startx < Render.getRenderer().width/2) {
            this.leftGesture = gesture;
        } else {
            this.rightGesture = gesture;
        }
    }
}

/***************/
/* LevelScreen */
/***************/

/* A container for holding screen-related stuff for playing a level. This
 * includes the level itself, PIXI container (staging area for rendering),
 * and the UI elements. (health bar, etc) */
export class LevelScreen
{
    constructor(opts)
    {
        // The various states this screen can be in
        this.NEW_GAME = 1;
        this.PLAYING = 2;
        this.NEXT_LEVEL = 3;
        this.GAME_OVER = 4;

        this.levelNum = 0;
        this.level = null;
        this.state = this.NEW_GAME;

        this.stage = new PIXI.Container();

        this.goMarker = new GoMarker(this);
        this.gameUI = new GameUI();
        this.stage.addChild(this.goMarker.sprite);
        this.stage.addChild(this.gameUI.container);
    }

    destroy()
    {
        if (this.gameUI) {
            this.gameUI.destroy();
            this.level.destroy();
            this.gameUI = null;
            this.level = null;
        }
    }

    update(dt)
    {
        switch(this.state) {
        case this.NEW_GAME:
            // Generate a new level and player character
            this.controls = GameControls.getControls();
            this.player = new Player(this.controls);
            this.levelNum = 0;
            // Auto-generate the first level
            let level = generateLevel(this.levelNum);
            this.setLevel(level);
            // Start playing it immediately
            this.state = this.PLAYING;
            Audio.startMusic();
            break;

        case this.PLAYING:
            if (this.level.isFinished()) {
                // Proceed to the next level
                let level = generateLevel(++this.levelNum);
                this.setLevel(level);
            } else if (this.player.dead) {
                // This triggers the game state machine to advance to the game
                // over screen.
                Audio.stopMusic();
                this.state = this.GAME_OVER;
            } else {
                if (this.level) this.level.update(dt);
                this.gameUI.update(dt);
                this.goMarker.update(dt);
            }
            break;

        case this.NEXT_LEVEL:
            break;

        case this.GAME_OVER:
            break;
        }
        if (this.controls) {
            this.controls.gesture = null;
        }
    }

    render()
    {
        if (this.level) {
            Render.getRenderer().render(this.stage);
        }
    }

    setLevel(level)
    {
        // Remove the previous level sprite container
        if (this.level) {
            this.stage.removeChild(this.level.stage);
            this.level.destroy();
            this.level = null;
        }
        if (!level) return;

        // Add the level (container) sprite to the start of the list of
        // child sprites, so it gets rendered before anything else.
        // (ie UI elements are drawn on top of the level)
        this.stage.addChildAt(level.stage, 0);
        this.level = level;

        this.gameUI.setPlayer(this.player);
        this.gameUI.container.position.set(0, level.height);
        this.gameUI.doLayout(
            level.camera.width,
            level.camera.height-level.height);

        // Put the go marker in the top-right corner of the level area
        this.goMarker.sprite.position.set(level.camera.width-1, 2);
        this.level.player = this.player;
        this.level.addThing(this.player);
        this.level.update(0);
        this.gameUI.update(0);

        this.handleResize()
    }

    handleGesture(gesture)
    {
        if (this.controls) {
            this.controls.gesture = gesture;
        }
    }

    handleResize()
    {
        if (this.level) {
            let scale = Math.min(
                Render.getRenderer().width / this.level.camera.width,
                Render.getRenderer().height / this.level.camera.height);
            this.stage.scale.set(scale);
        }
    }
}

LevelScreen.getAspectRatio = function()
{
    return (Level.CAMERA_WIDTH / Level.CAMERA_HEIGHT);
}
