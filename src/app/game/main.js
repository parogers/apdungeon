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
import { sound } from '@pixi/sound';
import { RES } from './res';
import { Render } from './render';
import { GameControls } from './controls';
import { LevelScreen } from './levelscreen';
import { GameState } from './gamestate';
import { Utils } from './utils';
import { GestureManager } from './gesture';
import { Resources } from './res';

import { ChunkTemplate, Tileset } from './bg';

/* TODO - the game is implemented as a big loop where 'update' is called on
 * the level every iteration before painting the screen. (in term the level
 * calls 'update' on all things in the level, plus arena controllers, etc.
 * This could be better implemented as an event loop, where things queue
 * up events for callback later, issue broadcast events etc. This has the
 * benefit where entities that don't need to do anything (eg blood spatter),
 * or objects waiting for a trigger (eg door) don't waste processor time */

export class Game
{
    constructor(element)
    {
        this.gamestate = null;
        this.stage = null;

        Render.configure(element, LevelScreen.getAspectRatio());
        GameControls.configure();

        this.gestureMgr = new GestureManager();
        this.gestureMgr.attach(Render.getRenderer().view);
        this.gestureMgr.gestureCallback = (gesture) => {
            this.gamestate.handleGesture(gesture);
        };
    }

    resize() {
        if (this.gamestate) {
            this.gamestate.handleResize();
        }
    }

    gameloop()
    {
        if (!this.gamestate) {
            return;
        }
        const dt = PIXI.Ticker.shared.elapsedMS/1000;

        this.gamestate.update(dt);
        GameControls.update(dt);
        this.gamestate.render();
    }

    async start()
    {
        await Resources.load();
        this.gamestate = new GameState();
        this.stage = new PIXI.Container();
        this.stage.children = [];

        PIXI.Ticker.shared.add(() => {
            this.gameloop()
        });
    }
}
