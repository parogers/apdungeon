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

/* The finite state machine that drives the entire game. It manages things
 * at a high level, loading and unloading screens as it transitions
 * between game states. */

function GameState()
{
    // Loading assets and showing the loading screen
    this.LOADING = 1;
    // Showing the title screen - waiting for player to start
    this.TITLE_SCREEN = 2;
    // Playing through a level
    this.LEVEL_SCREEN = 3;
    // Showing the "next level" transition screen
    this.NEXT_SCREEN = 4;
    // Showing the game over screen
    this.GAME_OVER = 5;

    this.screen = null;
}

/* Called every render frame to update the overall game state, transition
 * between states and otherwise manage things at a high level. */
GameState.prototype.update = function(dt)
{
    if (this.screen) {
	this.screen.update(dt);
    }
}

/* Called to render the current game state */
GameState.prototype.render = function()
{
    if (this.screen) {
	this.screen.render();
    }
}

