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

import { TitleScreen } from './titlescreen';
import { Render } from './render';
import { GameOverScreen } from './gameover';
import { LevelScreen } from './levelscreen';

/* The finite state machine that drives the entire game. It manages things
 * at a high level, loading and unloading screens as it transitions
 * between game states. */

export class GameState
{
    constructor()
    {
        // Loading assets and showing the loading screen
        this.LOADING = 1;
        // Show the title screen
        this.SHOW_TITLE_SCREEN = 2;
        // Showing the title screen - waiting for player to start
        this.TITLE_SCREEN = 3;
        // Playing through a level
        this.PLAYING_GAME = 4;
        // Showing the "next level" transition screen
        this.NEXT_SCREEN = 5;
        // Showing the game over screen
        this.GAME_OVER = 6;
        // Starting a new game
        this.NEW_GAME = 7;

        this.state = this.SHOW_TITLE_SCREEN;
        this.screen = null;
        // Whether we should enable touch by default. This is decided based on
        // what the player does to star the game at the title screen.
        this.enableTouch = false;

        window.addEventListener("resize", () => {
            var div = Render.getContainer();
            var width = window.innerWidth-5;
            var height = window.innerHeight-5;
            div.style.width = width;
            div.style.height = height;
            Render.getRenderer().resize(width, height);
            if (this.screen && this.screen.handleResize) {
                this.screen.handleResize();
            }
        });
    }

    /* Called every render frame to update the overall game state, transition
     * between states and otherwise manage things at a high level. */
    update(dt)
    {
        if (this.screen) {
            this.screen.update(dt);
        }

        switch(this.state) {
        case this.SHOW_TITLE_SCREEN:
            this.screen = new TitleScreen();
            this.state = this.TITLE_SCREEN;
            break;

        case this.TITLE_SCREEN:
            if (this.screen.state === this.screen.NEW_GAME) {
                this.screen.destroy();
                this.state = this.NEW_GAME;
                this.enableTouch = this.screen.touchClicked;
            }
            break;

        case this.NEW_GAME:
            // Start a new game
            this.screen = new LevelScreen({
                enableTouch: this.enableTouch
            });
            this.state = this.PLAYING_GAME;
            break;

        case this.PLAYING_GAME:
            // Wait until a game over happens
            if (this.screen.state === this.screen.GAME_OVER) {
                // Transition to the game over screen
                this.screen = new GameOverScreen(this.screen);
                this.state = this.GAME_OVER;
            }
            break;

        case this.GAME_OVER:
            // Wait until the player is finished with the game over screen
            if (this.screen.state === this.screen.DONE) {
                this.screen.destroy();
                this.state = this.NEW_GAME;
            }
            break;
        }
    }

    /* Called to render the current game state */
    render()
    {
        if (this.screen) {
            this.screen.render();
        }
    }

    handleResize()
    {
        Render.resize();
        if (this.screen && this.screen.handleResize) {
            this.screen.handleResize();
        }
    }
}
