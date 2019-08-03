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

import { Gate } from './gate';
import { Utils } from './utils';
import { RES } from './res';
import { Level } from './level';
import { GameControls, ManualControls } from './controls';

/* A door is basically a gate with different graphics, and an extra sprite
 * behind it so when the door opens, it shows darkness behind it. */
export class Door extends Gate
{
    constructor()
    {
        super();
        this.frames = [
            Utils.getFrame(RES.MAP_OBJS, "door1"),
            Utils.getFrame(RES.MAP_OBJS, "door2"),
            Utils.getFrame(RES.MAP_OBJS, "door3"),
            Utils.getFrame(RES.MAP_OBJS, "door4")
        ];
        this.fps = 3;
        this.sprite.anchor.set(0.5,1);
        this.sprite.texture = this.frames[0];
    }
}

/**************/
/* EnterScene */
/**************/

/* A thing to handle the player entering a level. (door opens, player walks
 * through the door, looks around, door closes, level starts) */
export class EnterScene
{
    constructor(door)
    {
        // Waiting for the cutscene to start
        this.IDLE = 0;
        // The cutscene has started
        this.START = 1;
        // Waiting for the door to finish opening
        this.OPENING_DOOR = 2;
        // Waiting for the player to enter the level
        this.PLAYER_ENTERING = 3;
        // Player is looking around
        this.PLAYER_LOOK_LEFT = 4;
        this.PLAYER_LOOK_RIGHT = 5;

        this.door = door;
        // No sprite associated with this thing
        this.sprite = null;
        this.state = this.IDLE;
        this.timer = 0;
        this.travelTime = 0;
    }

    update(dt)
    {
        if (this.timer > 0) {
            this.timer -= dt;
            return;
        }

        let player = this.level.player;

        switch(this.state) {
        case this.IDLE:
            // Position the player behind the level so they're hidden, and
            // centered on the door so the camera renders in the right place.
            player.fx = this.door.sprite.x;
            player.fy = this.door.sprite.y+1;
            player.zpos = Level.BEHIND_BACKGROUND_POS;
            player.controls = new ManualControls();
            player.running = false;
            this.timer = 0.75;
            this.state = this.START;
            break;

        case this.START:
            // Start the door opening
            this.door.startOpening();
            this.state = this.OPENING_DOOR;
            break;

        case this.OPENING_DOOR:
            // Waiting for the door to open
            if (this.door.isOpen()) {
                // Move the door into the background behind all other
                // sprites, and let the players z-pos vary again.
                player.zpos = undefined;
                this.door.zpos = Level.FLOOR_POS;
                this.state = this.PLAYER_ENTERING;
                this.timer = 0.4;
                player.moveToTrack(this.level.getBottomTrack());
            }
            break;

        case this.PLAYER_ENTERING:
            // Wait for the player to hit the track
            if (!player.isMovingToTrack()) {
                this.state = this.PLAYER_LOOK_LEFT;
            }
            break;

        case this.PLAYER_LOOK_LEFT:
            player.faceDirection(-1);
            this.state = this.PLAYER_LOOK_RIGHT;
            this.timer = 0.25;
            break;

        case this.PLAYER_LOOK_RIGHT:
            player.faceDirection(1);
            this.timer = 0.25;
            // Done!
            this.state = this.PLAYER_DONE;
            break;

        case this.PLAYER_DONE:
            player.controls = GameControls.getControls();
            player.running = true;
            this.level.removeThing(this);
            break;
        }
    }
}
