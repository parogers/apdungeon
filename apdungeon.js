(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.apdungeon = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
"use strict";

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

var RES = require("./res");
var Scenery = require("./scenery");
var Utils = require("./utils");
var Level = require("./level");
var Audio = require("./audio");

/*********/
/* Arena */
/*********/

/* TODO - arenas could be implemented as level Things which control/limit
 * camera movement, rather than having that logic inside of Level itself. 
 * It would help clean up Level a bit without making Arena that much more 
 * complicated.
 */

// A region of the level where the player battles monsters and collects 
// treasures. Once all monsters in the region are defeated the player can
// move forward. (a "Go" arrow is displayed)
function Arena(level, width, endx) {
    this.level = level;
    this.startx = 0;
    this.endx = 0;
    if (width !== undefined && endx !== undefined) {
        this.startx = endx - width;
        this.endx = endx;
    }
    // The rounds to play through (Round instances)
    this.rounds = [];
    this.running = [];
    this.round = -1;
    this.finishing = false;
    this.done = false;
    this.doneDelay = 2;
}

// Called once per frame while the arena is active
Arena.prototype.update = function (dt) {
    if (this.done) return;
    if (this.finishing) {
        // This arena is finished, but we wait a bit of time befoer displaying
        // the go marker for the player to advance.
        if (this.doneDelay > 0) {
            this.doneDelay -= dt;
            return;
        }
        this.done = true;
        return;
    }

    if (this.round === -1 || this.rounds[this.round].done) {
        if (this.round < this.rounds.length - 1) {
            // Spawn in monsters for the next round
            this.round++;
            //this.rounds[this.round].activate();
        } else {
            this.finishing = true;
        }
    } else {
        this.rounds[this.round].update(dt);
    }
};

Arena.prototype.activate = function () {};

/*********/
/* Round */
/*********/

// Each round will spawn a number of monsters and includes a "win condition"
// that determines when the round is finished. (and the arena progresses to
// the next round)
function Round(level, delay) {
    this.level = level;
    this.delay = delay || 0;
    // Spawns are initially added to the 'spawns' queue, then moved over to
    // the 'running' queue once they become active.
    this.spawns = [];
    this.running = [];
    this.done = false;
    this.activated = false;
}

Round.prototype.update = function (dt) {
    // Move spawns over to the 'running' queue
    if (this.spawns.length > 0) {
        if (this.spawns[0].roundDelay > 0) {
            // Still waiting for the next spawn to start
            this.spawns[0].roundDelay -= dt;
        } else {
            var spawn = this.spawns.shift();
            spawn.activate();
            this.running.push(spawn);
        }
    }

    /*
      if (!this.activated) 
      {
      // Wait a bit before activating the round
      if (this.delay > 0) {
      this.delay -= dt;
      return;
      }
      // Activate all the spawners in this round
      for (spawn of this.spawns) {
      spawn.activate();
      }
      this.activated = true;
      }
    */
    // Wait for all the monsters to die
    this.done = this.spawns.length === 0;
    var _iteratorNormalCompletion = true;
    var _didIteratorError = false;
    var _iteratorError = undefined;

    try {
        for (var _iterator = this.running[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
            var _spawn = _step.value;

            if (_spawn.update) _spawn.update(dt);
            if (!_spawn.monster.dead) this.done = false;
        }
    } catch (err) {
        _didIteratorError = true;
        _iteratorError = err;
    } finally {
        try {
            if (!_iteratorNormalCompletion && _iterator.return) {
                _iterator.return();
            }
        } finally {
            if (_didIteratorError) {
                throw _iteratorError;
            }
        }
    }
};

// Add a monster spawner to this round
Round.prototype.addSpawn = function (spawn, delay) {
    // TODO - tacky
    spawn.roundDelay = delay || 0;
    this.spawns.push(spawn);
};

/*********/
/* Spawn */
/*********/

// Spawns are triggered by rounds, and add monsters into the arena to fight
// with the player. The spawn determines where to place the monster once the
// round becomes active. Types of spawns: from left, from right, from under 
// water, through a gate, drop from above

// Spawn from the left/right side of the screen (monster starts off-screen)
function Spawn(level, monster, direction, ypos) {
    this.level = level;
    this.monster = monster;
    this.direction = direction;
    this.ypos = ypos;
}

Spawn.prototype.activate = function () {
    // Start the monster somewhere off screen either left or right
    this.monster.sprite.x = this.level.camera.x + this.level.camera.width / 2 + this.direction * (this.level.camera.width / 2 + 4);
    var offset = 0;

    // Find some clear space to spawn the monster (ie don't spawn in a wall)
    var y = this.level.findClearSpace(this.monster.sprite.x, this.ypos);
    if (y === null) {
        console.log("WARNING: can't spawn monster near " + this.ypos);
        this.monster.dead = true;
    } else {
        this.monster.sprite.y = y;
        this.level.addThing(this.monster);
    }
};

/*************/
/* GateSpawn */
/*************/

// Monster walks in through a gate
function GateSpawn(level, monster, gate) {
    this.level = level;
    this.monster = monster;
    this.gate = gate;
    this.spawned = false;
    this.closeDelay = 0.5;
}

GateSpawn.prototype.activate = function () {
    // Start the gate opening
    this.gate.startOpening();
};

GateSpawn.prototype.update = function (dt) {
    // Wait for the gate to finish opening
    if (!this.spawned && this.gate.isOpen()) {
        // Spawn in the monster, overtop the opened gate
        this.spawned = true;
        this.level.addThing(this.monster);
        this.monster.sprite.x = this.gate.sprite.x + this.gate.sprite.texture.width / 2;
        this.monster.sprite.y = this.gate.sprite.y + this.gate.sprite.texture.height;
    } else if (this.spawned && this.closeDelay > 0) {
        // Wait a bit before closing the gate again
        this.closeDelay -= dt;
        if (this.closeDelay <= 0) {
            this.gate.startClosing();
        }
    }
};

/*************/
/* DropSpawn */
/*************/

// Monster drops from above to the given location (casting a shadow on the
// way down, etc.)
function DropSpawn(level, monster, x, y) {
    this.level = level;
    this.monster = monster;
    this.xpos = x;
    this.ypos = y;
    this.done = false;
    // Shadow to display on the floor, as the monster is falling
    this.shadow = new Scenery(Utils.getFrame(RES.MAPTILES, "shadow"));
    this.shadow.sprite.zpos = Level.FLOOR_POS;
    this.shadow.sprite.anchor.set(0.5, 0.5);
    this.shadow.sprite.x = x;
    this.shadow.sprite.y = y;
    // The monster as it's falling
    var img = this.monster.dropFrame || this.monster.frames[0];
    this.falling = new Scenery(img);
    this.timer = 0.5;
    this.fallSpeed = 40;
}

DropSpawn.prototype.activate = function () {
    var y = this.level.findClearSpace(this.xpos, this.ypos);
    if (y === null) {
        console.log("WARNING: can't spawn monster near " + this.ypos);
        this.monster.dead = true;
        return;
    }
    this.ypos = y;
    this.shadow.sprite.y = y;
    this.level.addThing(this.shadow);
    this.falling.sprite.zpos = Level.FRONT_POS;
    this.falling.sprite.x = this.xpos;
    this.falling.sprite.y = this.level.camera.y + 4;
};

DropSpawn.prototype.update = function (dt) {
    if (this.done) return;
    // Wait a bit before dropping the monster
    if (this.timer > 0) {
        this.timer -= dt;
        if (this.timer <= 0) {
            // Start the drop
            this.level.addThing(this.falling);
            Audio.playSound(RES.DROP_SND, 0.25);
        }
        return;
    }
    this.falling.sprite.y += this.fallSpeed * dt;
    if (this.falling.sprite.y > this.ypos) {
        // Hit the ground - spawn in the monster
        this.level.removeThing(this.shadow);
        this.level.removeThing(this.falling);
        this.level.addThing(this.monster);
        this.monster.sprite.x = this.xpos;
        this.monster.sprite.y = this.ypos;
        this.done = true;
    }
};

/**************/
/* WaterSpawn */
/**************/

// Monster spawns under water, then rises with bubbles etc
function WaterSpawn(level, monster, x, y) {
    this.level = level;
    this.monster = monster;
    this.xpos = x;
    this.ypos = y;
    var img = Utils.getFrame(RES.MAPTILES, "rippling_water");
    this.water = new Scenery(img);
    this.water.sprite.anchor.set(0.5, 0.7);
    this.water.sprite.x = x;
    this.water.sprite.y = y;
    this.spawnDelay = 1;
}

WaterSpawn.prototype.activate = function () {
    // Show the water rippling right away
    this.level.addThing(this.water);
};

WaterSpawn.prototype.update = function (dt) {
    // Wait for a bit of time before spawning the monster
    if (this.spawnDelay > 0) {
        this.spawnDelay -= dt;
        if (this.spawnDelay <= 0) {
            this.level.removeThing(this.water);
            this.level.addThing(this.monster);
            this.monster.sprite.x = this.xpos;
            this.monster.sprite.y = this.ypos;
        }
    }
};

module.exports = {
    Arena: Arena,
    Round: Round,
    Spawn: Spawn,
    WaterSpawn: WaterSpawn,
    DropSpawn: DropSpawn,
    GateSpawn: GateSpawn
};

},{"./audio":2,"./level":16,"./res":23,"./scenery":24,"./utils":30}],2:[function(require,module,exports){
"use strict";

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

var RES = require("./res");

var enabled = true;

module.exports = {};
module.exports.playSound = function (res, vol) {
    if (enabled) {
        if (vol !== undefined) sounds[res].volume = vol;
        sounds[res].play();
    }
};

module.exports.setEnabled = function (b) {
    enabled = b;
    if (enabled) module.exports.startMusic();else module.exports.stopMusic();
};

module.exports.startMusic = function () {
    var snd = sounds[RES.GAME_MUSIC];
    snd.loop = true;
    snd.volume = 0.5;
    // Start playing music (fade in). We call restart, which stops the
    // previously play (if any), rewinds and starts again.
    snd.restart();
    snd.fadeIn(1);
};

module.exports.stopMusic = function () {
    sounds[RES.GAME_MUSIC].pause();
};

},{"./res":23}],3:[function(require,module,exports){
"use strict";

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

var Render = require("./render");
var Utils = require("./utils");

function Tile(name, solid, wall) {
    this.name = name;
    this.solid = solid;
    this.wall = false;
}

function Tileset() {
    var wall = new Tile("wall", true, true);
    var floor = new Tile("floor", false, false);
    var water = new Tile("water", false, false);
    water.water = true;
    this.tiles = {
        "smooth_floor_m": floor,
        "smooth_wall_m": wall,
        "water": water
    };
    this.wall = wall;
}

Tileset.prototype.getTile = function (name) {
    return this.tiles[name] || this.wall;
};

function TiledBackground(tileWidth, tileHeight, wallHeight, textures, grid) {
    /* Create a texture large enough to hold all the tiles, plus a little extra
     * for the first row, in case it contains wall tiles. (taller) */
    var renderTexture = PIXI.RenderTexture.create(grid[0].length * tileWidth, (grid.length - 1) * tileHeight + wallHeight);
    var cnt = new PIXI.Container();
    this.solid = Utils.createGrid(grid.rows, grid.cols);
    for (var row = 0; row < grid.length; row++) {
        for (var col = 0; col < grid[0].length; col++) {
            var sprite = new PIXI.Sprite(textures[grid[row][col]]);
            sprite.anchor.set(0, 1);
            sprite.x = col * tileWidth;
            sprite.y = wallHeight + row * tileHeight;
            //(row+1)*tileHeight-(sprite.texture.height-tileHeight);
            cnt.addChild(sprite);
            this.solid[row][col] = grid[row][col] !== "smooth_floor_m";
        }
    }
    cnt.x = 0;
    cnt.y = 0;
    Render.getRenderer().render(cnt, renderTexture);

    this.tileset = new Tileset();
    this.grid = grid;
    this.tileWidth = tileWidth;
    this.tileHeight = tileHeight;
    this.wallHeight = wallHeight;
    this.sprite = new PIXI.Sprite();
    this.sprite.texture = renderTexture;
    this.sprite.x = 0;
    this.sprite.y = 0;
    //this.sprite.scale.set(1.8);
}

TiledBackground.prototype.getTileAt = function (x, y) {
    // Account for the background offset, and also for the fact that the
    // first row of tiles are wall tiles. (ie taller)
    var x = x - this.sprite.x;
    var y = y - this.sprite.y - (this.wallHeight - this.tileHeight);

    var row = y / this.tileHeight | 0;
    var col = x / this.tileWidth | 0;
    if (this.grid[row])
        //return this.tileset.getTile(this.grid[row][col]);
        return this.tileset.tiles[this.grid[row][col]] || this.tileset.wall;

    return this.tileset.wall;
};

TiledBackground.prototype.getHeight = function () {
    return this.sprite.texture.height;
};

module.exports = TiledBackground;

},{"./render":22,"./utils":30}],4:[function(require,module,exports){
"use strict";

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

var RES = require("./res");
var Utils = require("./utils");
var Thing = require("./thing");
var GroundItem = require("./grounditem");
var Audio = require("./audio");

/* A container for holding items. The chest is opened when the player touches
 * it, and the chests contents are ejected randomly.
 * 
 * items - array of Item types
 * options.ejectX - a particular X direction to eject the items 
 * */
function Chest(items, options) {
    this.openTexture = Utils.getFrame(RES.MAPTILES, "chest_open");
    this.closedTexture = Utils.getFrame(RES.MAPTILES, "chest_closed");
    this.sprite = new PIXI.Sprite(this.closedTexture);
    this.sprite.anchor.set(0.5, 0.75);
    this.isOpen = false;
    this.timer = 0;
    this.items = items;
    this.options = options;
    this.hitbox = new Thing.Hitbox(0, 0, 5, 5);
}

Chest.prototype.update = function (dt) {
    if (this.isOpen && this.timer > 0) {
        this.timer -= dt;
        if (this.timer <= 0) {
            // Eject the contents from the chest
            var _iteratorNormalCompletion = true;
            var _didIteratorError = false;
            var _iteratorError = undefined;

            try {
                for (var _iterator = this.items[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
                    var item = _step.value;

                    var gnd = new GroundItem(item, this.sprite.x + 1 * Utils.randUniform(0, 1), this.sprite.y + 2 * Utils.randUniform(0.1, 1));
                    this.level.addThing(gnd);
                    var spd = Utils.randUniform(6, 12);
                    if (this.options && this.options.ejectX) {
                        gnd.velx = this.options.ejectX * spd;
                    } else {
                        gnd.velx = Utils.randomChoice([-1, 1]) * spd;
                    }
                    gnd.velz = -Utils.randUniform(-2, 6);
                    gnd.velh = -30 * Utils.randUniform(0.9, 1);
                }
            } catch (err) {
                _didIteratorError = true;
                _iteratorError = err;
            } finally {
                try {
                    if (!_iteratorNormalCompletion && _iterator.return) {
                        _iterator.return();
                    }
                } finally {
                    if (_didIteratorError) {
                        throw _iteratorError;
                    }
                }
            }
        }
    }
};

Chest.prototype.handleHit = function (x, y, dmg) {};

Chest.prototype.handlePlayerCollision = function (player) {
    if (!this.isOpen) {
        // Open the chest now and start a countdown timer before ejecting 
        // the contents.
        this.sprite.texture = this.openTexture;
        this.isOpen = true;
        this.timer = 0.25;
        Audio.playSound(RES.CHEST_SND);
    }
};

module.exports = Chest;

},{"./audio":2,"./grounditem":14,"./res":23,"./thing":27,"./utils":30}],5:[function(require,module,exports){
"use strict";

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

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

var PRIMARY = 90;
var PRIMARY_ALT = 65;
var SWAP = 88;
var SPACE = 32;
var ARROW_UP = 38;
var ARROW_LEFT = 37;
var ARROW_RIGHT = 39;
var ARROW_DOWN = 40;
var TEST_KEY = 75;

var DEFAULTS = [["up", ARROW_UP], ["down", ARROW_DOWN], ["left", ARROW_LEFT], ["right", ARROW_RIGHT], ["primary", [PRIMARY, PRIMARY_ALT]], ["swap", SWAP], ["space", SPACE]];

var controls = null;

/* A single input (eg attack) */

var Input = function () {
    function Input(name) {
        _classCallCheck(this, Input);

        this.name = name;
        this.held = false;
        this.pressed = false;
        this.released = false;
    }

    _createClass(Input, [{
        key: "press",
        value: function press(set) {
            this.pressed = !this.held;
            this.held = set === undefined ? true : set;
        }
    }, {
        key: "release",
        value: function release(set) {
            this.released = !!this.held;
            this.held = set === undefined ? false : set;
        }
    }]);

    return Input;
}();

function GameControls() {
    // Map of Input instances stored by key code
    this.inputByKey = {};
    this.inputs = [];
    var _iteratorNormalCompletion = true;
    var _didIteratorError = false;
    var _iteratorError = undefined;

    try {
        for (var _iterator = DEFAULTS[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
            var arg = _step.value;

            var name = arg[0];
            var keys = arg[1];

            if (typeof keys.push !== "function") {
                keys = [keys];
            }

            this[name] = new Input(name);
            this.inputs.push(this[name]);
            var _iteratorNormalCompletion2 = true;
            var _didIteratorError2 = false;
            var _iteratorError2 = undefined;

            try {
                for (var _iterator2 = keys[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
                    var key = _step2.value;

                    this.inputByKey[key] = this[name];
                }
            } catch (err) {
                _didIteratorError2 = true;
                _iteratorError2 = err;
            } finally {
                try {
                    if (!_iteratorNormalCompletion2 && _iterator2.return) {
                        _iterator2.return();
                    }
                } finally {
                    if (_didIteratorError2) {
                        throw _iteratorError2;
                    }
                }
            }
        }
    } catch (err) {
        _didIteratorError = true;
        _iteratorError = err;
    } finally {
        try {
            if (!_iteratorNormalCompletion && _iterator.return) {
                _iterator.return();
            }
        } finally {
            if (_didIteratorError) {
                throw _iteratorError;
            }
        }
    }
}

GameControls.prototype.getX = function () {
    return this.right.held - this.left.held;
};

GameControls.prototype.getY = function () {
    return this.down.held - this.up.held;
};

/* This should be called after the game state is updated */
GameControls.prototype.update = function () {
    var _iteratorNormalCompletion3 = true;
    var _didIteratorError3 = false;
    var _iteratorError3 = undefined;

    try {
        for (var _iterator3 = this.inputs[Symbol.iterator](), _step3; !(_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done); _iteratorNormalCompletion3 = true) {
            var input = _step3.value;

            input.pressed = false;
            input.released = false;
        }
    } catch (err) {
        _didIteratorError3 = true;
        _iteratorError3 = err;
    } finally {
        try {
            if (!_iteratorNormalCompletion3 && _iterator3.return) {
                _iterator3.return();
            }
        } finally {
            if (_didIteratorError3) {
                throw _iteratorError3;
            }
        }
    }
};

GameControls.prototype.attachKeyboardEvents = function () {
    var _this = this;

    window.addEventListener("keydown", function (event) {
        var input = _this.inputByKey[event.keyCode];
        if (input) {
            input.press();
            event.stopPropagation();
            event.preventDefault();
        }
    });

    window.addEventListener("keyup", function (event) {
        var input = _this.inputByKey[event.keyCode];
        if (input) {
            input.release();
            event.stopPropagation();
            event.preventDefault();
        }
    });
};

GameControls.prototype.attachTouchEvents = function () {
    this.touchAdapter = new TouchAdapter(window, this);
};

GameControls.prototype.attach = function () {
    this.attachKeyboardEvents();
    this.attachTouchEvents();
};

/* */

var TouchAdapter = function () {
    function TouchAdapter(el, controls) {
        _classCallCheck(this, TouchAdapter);

        this.controls = controls;
        this.attackTouch = null;
        this.movementTouch = null;
        this.tapTouch = null;
        this.element = el;

        el.addEventListener("touchstart", this.handleTouchStart.bind(this), true);
        el.addEventListener("touchmove", this.handleTouchMove.bind(this), true);
        el.addEventListener("touchend", this.handleTouchEnd.bind(this), true);
        el.addEventListener("touchcancel", this.handleTouchEnd.bind(this), true);
    }

    _createClass(TouchAdapter, [{
        key: "handleTouchStart",
        value: function handleTouchStart(event) {
            var Touch = function Touch(id, x, y) {
                _classCallCheck(this, Touch);

                this.id = id;
                this.startx = x;
                this.starty = y;
            };

            ;

            var middle = this.element.innerWidth / 2;
            var _iteratorNormalCompletion4 = true;
            var _didIteratorError4 = false;
            var _iteratorError4 = undefined;

            try {
                for (var _iterator4 = event.changedTouches[Symbol.iterator](), _step4; !(_iteratorNormalCompletion4 = (_step4 = _iterator4.next()).done); _iteratorNormalCompletion4 = true) {
                    var touch = _step4.value;

                    if (this.tapTouch === null) {
                        this.tapTouch = new Touch(touch.identifier, touch.pageX, touch.pageY);
                        this.controls.space.press();
                    }

                    if (touch.pageX > middle && this.attackTouch === null) {
                        this.attackTouch = new Touch(touch.identifier, touch.pageX, touch.pageY);
                        this.controls.primary.press();
                    } else if (touch.pageX < middle && this.movementTouch === null) {
                        this.movementTouch = new Touch(touch.identifier, touch.pageX, touch.pageY);
                        this.handleTouchMove(event);
                    }
                }
            } catch (err) {
                _didIteratorError4 = true;
                _iteratorError4 = err;
            } finally {
                try {
                    if (!_iteratorNormalCompletion4 && _iterator4.return) {
                        _iterator4.return();
                    }
                } finally {
                    if (_didIteratorError4) {
                        throw _iteratorError4;
                    }
                }
            }

            event.preventDefault();
            event.stopPropagation();
        }
    }, {
        key: "handleTouchMove",
        value: function handleTouchMove(event) {
            // Center of the on-screen controller
            var centreX = this.element.innerWidth / 6;
            var centreY = this.element.innerHeight / 2;
            var orad = this.element.innerHeight / 2 / 4;
            var irad = orad * 0.1;
            var _iteratorNormalCompletion5 = true;
            var _didIteratorError5 = false;
            var _iteratorError5 = undefined;

            try {
                for (var _iterator5 = event.changedTouches[Symbol.iterator](), _step5; !(_iteratorNormalCompletion5 = (_step5 = _iterator5.next()).done); _iteratorNormalCompletion5 = true) {
                    var touch = _step5.value;

                    if (this.movementTouch !== null && this.movementTouch.id === touch.identifier) {
                        var dx = touch.pageX - centreX;
                        var dy = touch.pageY - centreY;
                        var magx = Math.min((Math.abs(dx) - irad) / orad, 1);
                        var magy = Math.min((Math.abs(dy) - irad) / orad, 1);

                        if (dx >= irad) {
                            this.controls.left.release();
                            this.controls.right.press(magx);
                        } else if (dx <= -irad) {
                            this.controls.left.press(magx);
                            this.controls.right.release();
                        } else {
                            this.controls.left.release();
                            this.controls.right.release();
                        }

                        if (dy >= irad) {
                            this.controls.up.release();
                            this.controls.down.press(magy);
                        } else if (dy <= -irad) {
                            this.controls.up.press(magy);
                            this.controls.down.release();
                        } else {
                            this.controls.up.release();
                            this.controls.down.release();
                        }
                    }
                }
            } catch (err) {
                _didIteratorError5 = true;
                _iteratorError5 = err;
            } finally {
                try {
                    if (!_iteratorNormalCompletion5 && _iterator5.return) {
                        _iterator5.return();
                    }
                } finally {
                    if (_didIteratorError5) {
                        throw _iteratorError5;
                    }
                }
            }

            event.preventDefault();
            event.stopPropagation();
        }
    }, {
        key: "handleTouchEnd",
        value: function handleTouchEnd(event) {
            var _iteratorNormalCompletion6 = true;
            var _didIteratorError6 = false;
            var _iteratorError6 = undefined;

            try {
                for (var _iterator6 = event.changedTouches[Symbol.iterator](), _step6; !(_iteratorNormalCompletion6 = (_step6 = _iterator6.next()).done); _iteratorNormalCompletion6 = true) {
                    var touch = _step6.value;

                    if (this.tapTouch !== null && this.tapTouch.id === touch.identifier) {
                        this.tapTouch = null;
                        this.controls.space.release();
                    }
                    if (this.attackTouch !== null && this.attackTouch.id === touch.identifier) {
                        this.attackTouch = null;
                        this.controls.primary.release();
                    }
                    if (this.movementTouch !== null && this.movementTouch.id === touch.identifier) {
                        this.controls.up.release();
                        this.controls.down.release();
                        this.controls.left.release();
                        this.controls.right.release();
                        this.movementTouch = null;
                    }
                }
            } catch (err) {
                _didIteratorError6 = true;
                _iteratorError6 = err;
            } finally {
                try {
                    if (!_iteratorNormalCompletion6 && _iterator6.return) {
                        _iterator6.return();
                    }
                } finally {
                    if (_didIteratorError6) {
                        throw _iteratorError6;
                    }
                }
            }

            event.preventDefault();
            event.stopPropagation();
        }
    }]);

    return TouchAdapter;
}();

/******************/
/* ManualControls */
/******************/

var ManualControls = function () {
    function ManualControls() {
        _classCallCheck(this, ManualControls);

        this.dirx = 0;
        this.diry = 0;

        var _iteratorNormalCompletion7 = true;
        var _didIteratorError7 = false;
        var _iteratorError7 = undefined;

        try {
            for (var _iterator7 = DEFAULTS[Symbol.iterator](), _step7; !(_iteratorNormalCompletion7 = (_step7 = _iterator7.next()).done); _iteratorNormalCompletion7 = true) {
                var arg = _step7.value;

                var name = arg[0];
                this[name] = new Input(name);
            }
        } catch (err) {
            _didIteratorError7 = true;
            _iteratorError7 = err;
        } finally {
            try {
                if (!_iteratorNormalCompletion7 && _iterator7.return) {
                    _iterator7.return();
                }
            } finally {
                if (_didIteratorError7) {
                    throw _iteratorError7;
                }
            }
        }
    }

    _createClass(ManualControls, [{
        key: "getX",
        value: function getX() {
            return this.dirx;
        }
    }, {
        key: "getY",
        value: function getY() {
            return this.diry;
        }
    }]);

    return ManualControls;
}();

module.exports = {};
module.exports.configure = function () {
    controls = new GameControls();
    controls.attach();
};

module.exports.update = function () {
    controls.update();
};

module.exports.getControls = function () {
    return controls;
};

module.exports.ManualControls = ManualControls;

},{}],6:[function(require,module,exports){
"use strict";

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

var Gate = require("./gate");
var Utils = require("./utils");
var RES = require("./res");

/* A door is basically a gate with different graphics, and an extra sprite
 * behind it so when the door opens, it shows darkness behind it. */
function Door() {
  Gate.call(this);
  this.frames = [Utils.getFrame(RES.MAPTILES, "door1"), Utils.getFrame(RES.MAPTILES, "door2"), Utils.getFrame(RES.MAPTILES, "door3"), Utils.getFrame(RES.MAPTILES, "door4")];
  this.fps = 3;
  this.sprite.anchor.set(0.5, 1);
  this.sprite.texture = this.frames[0];
}

Door.prototype = Object.create(Gate.prototype);

module.exports = Door;

},{"./gate":9,"./res":23,"./utils":30}],7:[function(require,module,exports){
"use strict";

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

var RES = require("./res");
var Utils = require("./utils");
var Render = require("./render");
var UI = require("./ui");
var GameControls = require("./controls");

/* Displays a game over screen. The LevelScreen that caused the game over
 * should be passed in. This screen will make a gradual transition from 
 * the level scene to a general game over screen, showing stats etc */
function GameOverScreen(levelScreen) {
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

    this.screenHeight = 80;
    var scale = Render.getRenderer().height / this.screenHeight;

    this.screenWidth = Render.getRenderer().width / scale;

    this.levelScreen = levelScreen;
    this.state = this.TRANSITION_TO_GAMEOVER;

    this.stage = new PIXI.Container();
    this.stage.scale.set(scale);
    this.stage.addChild(levelScreen.stage);
    levelScreen.stage.scale.set(levelScreen.stage.scale.x / scale);

    // Create a black sprite that covers the screen
    this.bg = new PIXI.Sprite(Utils.getFrame(RES.UI, "black"));
    this.bg.anchor.set(0, 0);
    this.bg.scale.set(this.screenWidth / this.bg.texture.width, this.screenHeight / this.bg.texture.height);
    this.bg.alpha = 0;
    this.timer = 0;
    this.delay = 0.25;

    // Build a list of kill stats, in sorted order
    this.row = 0;
    this.col = 0;
    this.killStats = [];
    var names = Object.keys(levelScreen.player.kills);
    var _iteratorNormalCompletion = true;
    var _didIteratorError = false;
    var _iteratorError = undefined;

    try {
        for (var _iterator = names[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
            var name = _step.value;

            var stat = levelScreen.player.kills[name];
            this.killStats.push({
                count: stat.count,
                img: stat.img,
                name: name
            });
        }
    } catch (err) {
        _didIteratorError = true;
        _iteratorError = err;
    } finally {
        try {
            if (!_iteratorNormalCompletion && _iterator.return) {
                _iterator.return();
            }
        } finally {
            if (_didIteratorError) {
                throw _iteratorError;
            }
        }
    }

    this.stage.addChild(this.bg);
}

GameOverScreen.prototype.update = function (dt) {
    if (this.delay > 0) {
        this.delay -= dt;
        return;
    }

    switch (this.state) {
        case this.TRANSITION_TO_GAMEOVER:
            // Transitioning from the level to a blank screen. The curve here is
            // chosen so that the fade starts out quickly, then slows down as it
            // approaches full black.
            this.timer += dt;
            this.bg.alpha = Math.pow(this.timer / 1.25, 0.5);
            if (this.bg.alpha > 1) {
                // Background is now fully black. Show the game over text
                this.bg.alpha = 1;
                var txt = new PIXI.Sprite(Utils.getFrame(RES.UI, "game-over-text"));
                txt.anchor.set(0.5, 0.5);
                txt.x = this.screenWidth / 2;
                txt.y = this.screenHeight / 8;
                this.stage.addChild(txt);
                this.state = this.SHOWING_KILLS;
                this.delay = 0.75;
            }
            break;

        case this.SHOWING_KILLS:
            while (this.killStats.length > 0) {
                // Show the next killed monster
                var xpos = 10 + this.col * this.screenWidth / 2;
                var ypos = 30 + this.row * 11;
                var stat = this.killStats.shift();
                var monster = new PIXI.Sprite(stat.img);
                monster.anchor.set(0.5, 1);
                monster.x = xpos;
                monster.y = ypos;
                this.stage.addChild(monster);

                // Show the name
                var msg = stat.name.toUpperCase() + " *" + stat.count;
                var txt = new PIXI.Sprite(UI.renderText(msg));
                txt.x = xpos + 8;
                txt.y = ypos;
                txt.anchor.set(0, 1);
                txt.scale.set(0.65);
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
            var txt = new PIXI.Sprite(UI.renderText("PRESS SPACE TO CONTINUE"));
            txt.anchor.set(0.5, 0.5);
            txt.x = this.screenWidth / 2;
            txt.y = this.screenHeight - 15;
            this.stage.addChild(txt);
            this.state = this.WAITING;
            break;

        case this.WAITING:
            if (GameControls.getControls().space.released) {
                this.state = this.DONE;
            }
            break;
    }
};

GameOverScreen.prototype.render = function () {
    Render.getRenderer().render(this.stage);
};

GameOverScreen.prototype.handleResize = function () {
    // TODO - implement this
};

module.exports = GameOverScreen;

},{"./controls":5,"./render":22,"./res":23,"./ui":29,"./utils":30}],8:[function(require,module,exports){
"use strict";

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

var TitleScreen = require("./titlescreen");
var LevelScreen = require("./levelscreen");
var GameOverScreen = require("./gameover");
var Render = require("./render");

/* The finite state machine that drives the entire game. It manages things
 * at a high level, loading and unloading screens as it transitions
 * between game states. */

function GameState() {
    var _this = this;

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

    window.addEventListener("resize", function () {
        var div = Render.getContainer();
        var width = window.innerWidth - 5;
        var height = window.innerHeight - 5;
        div.style.width = width;
        div.style.height = height;
        Render.getRenderer().resize(width, height);
        if (_this.screen && _this.screen.handleResize) {
            _this.screen.handleResize();
        }
    });
}

/* Called every render frame to update the overall game state, transition
 * between states and otherwise manage things at a high level. */
GameState.prototype.update = function (dt) {
    if (this.screen) {
        this.screen.update(dt);
    }

    switch (this.state) {
        case this.SHOW_TITLE_SCREEN:
            //this.state = this.NEW_GAME;
            this.screen = new TitleScreen();
            this.state = this.TITLE_SCREEN;
            break;

        case this.TITLE_SCREEN:
            if (this.screen.state === this.screen.NEW_GAME) {
                this.state = this.NEW_GAME;
            }
            break;

        case this.NEW_GAME:
            // Start a new game
            this.screen = new LevelScreen();
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
                this.state = this.NEW_GAME;
            }
            break;
    }
};

/* Called to render the current game state */
GameState.prototype.render = function () {
    if (this.screen) {
        this.screen.render();
    }
};

GameState.prototype.handleResize = function () {
    Render.resize();
    if (this.screen && this.screen.handleResize) {
        this.screen.handleResize();
    }
};

module.exports = GameState;

},{"./gameover":7,"./levelscreen":17,"./render":22,"./titlescreen":28}],9:[function(require,module,exports){
"use strict";

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

var RES = require("./res");
var Utils = require("./utils");
var Thing = require("./thing");
var GameControls = require("./controls");
var Audio = require("./audio");

function Gate() {
    this.frames = [Utils.getFrame(RES.MAPTILES, "gate_wall_1"), Utils.getFrame(RES.MAPTILES, "gate_wall_2"), Utils.getFrame(RES.MAPTILES, "gate_wall_3")];
    this.hitbox = new Thing.Hitbox(0, 0, 5, 5);
    this.sprite = new PIXI.Sprite(this.frames[0]);
    this.sprite.anchor.set(0, 0);
    this.frameNum = 0;
    this.fps = 2;
    this.moving = 0;
}

Gate.prototype.isOpen = function () {
    return this.frameNum === this.frames.length - 1 && this.moving === 0;
};

Gate.prototype.startOpening = function () {
    if (this.frameNum < this.frames.length - 1) {
        this.moving = 1;
    }
};

Gate.prototype.startClosing = function () {
    if (this.frameNum > 0) {
        this.moving = -1;
    }
};

Gate.prototype.update = function (dt) {
    // The gate is opening or closing
    if (this.moving !== 0) {
        var fnum = Math.round(2 * this.frameNum);
        this.frameNum += this.moving * this.fps * dt;
        if (this.frameNum < 0) {
            // Finished closing
            this.frameNum = 0;
            this.moving = 0;
        } else if (this.frameNum >= this.frames.length - 1) {
            // Finished opening
            this.frameNum = this.frames.length - 1;
            this.moving = 0;
        }
        // Make a "clicksh" noise as the gate is opening. (we do this every
        // other frame to make it more obvious, hence the '2' here and above)
        if (fnum !== Math.round(2 * this.frameNum)) {
            Audio.playSound(RES.GATE_SND, 0.2);
        }
    }
    this.sprite.texture = this.frames[Math.round(this.frameNum) | 0];
};

Gate.prototype.handleHit = function (x, y, dmg) {};

Gate.prototype.handlePlayerCollision = function (player) {
    if (this.isOpen() && this === this.level.exitDoor && GameControls.getControls().up && Math.abs(player.sprite.y - this.sprite.y) < 5) {
        // Next level
        this.level.state = this.level.FINISHED;
    }
};

module.exports = Gate;

},{"./audio":2,"./controls":5,"./res":23,"./thing":27,"./utils":30}],10:[function(require,module,exports){
"use strict";

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

var RES = require("./res");
var Utils = require("./utils");
var TiledBackground = require("./bg");
var Level = require("./level");
var Door = require("./door");
var Gate = require("./gate");
var Arena = require("./arena");
var SnakeLike = require("./snake");
var Goblin = require("./goblin");
var SkelWarrior = require("./skel_warrior");
var Ghost = require("./ghost");
var NPC = require("./npc");
var Chest = require("./chest");
var Item = require("./item");
var GroundItem = require("./grounditem");
var Utils = require("./utils");
var GameControls = require("./controls");

var randint = Utils.randint;
var randomChoice = Utils.randomChoice;
var randUniform = Utils.randUniform;

var Snake = SnakeLike.Snake;
var Rat = SnakeLike.Rat;
var Scorpion = SnakeLike.Scorpion;

function monsterEntry(klass, score, addScore) {
    return {
        klass: klass,
        score: score,
        addScore: addScore
    };
}

/* Returns some random treasures for a chest */
function randomTreasures(levelNum) {
    switch (randint(1, 10)) {
        case 1:
            return [Item.Table.COIN, Item.Table.COIN, Item.Table.COIN];
        case 2:
            return [Item.Table.COIN, Item.Table.COIN, Item.Table.COIN, Item.Table.COIN, Item.Table.COIN];
        case 3:
            if (levelNum < 2) return [Item.Table.SMALL_BOW, Item.Table.ARROW];else return [Item.Table.LARGE_BOW];
        case 4:
            if (levelNum < 2) return [Item.Table.LEATHER_ARMOUR];else return [Item.Table.STEEL_ARMOUR];
        case 5:
            return [Item.Table.SMALL_HEALTH, Item.Table.SMALL_HEALTH, Item.Table.ARROW, Item.Table.ARROW];
        case 6:
        case 7:
            return [Item.Table.COIN, Item.Table.COIN, Item.Table.SMALL_HEALTH];
        case 8:
            return [Item.Table.COIN, Item.Table.COIN, Item.Table.LARGE_HEALTH];
        case 9:
            return [Item.Table.LARGE_SWORD];
        case 10:
            return [Item.Table.ARROW, Item.Table.ARROW, Item.Table.ARROW, Item.Table.COIN, Item.Table.COIN];
    }
}

// Returns a list of randomly chosen monsters that fall within the budget
function chooseMonsters(budget) {
    var monsterTable = [monsterEntry(Snake, 1, 1), monsterEntry(Rat, 1, 1), monsterEntry(Scorpion, 2, 1), monsterEntry(Goblin, 3, 2), monsterEntry(SkelWarrior, 4, 3), monsterEntry(Ghost, 5, 4)];

    var picks = [];
    while (true) {
        // Compile a list of monster options to choose from
        var options = [];
        var _iteratorNormalCompletion = true;
        var _didIteratorError = false;
        var _iteratorError = undefined;

        try {
            for (var _iterator = monsterTable[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
                var entry = _step.value;

                if (entry.score <= budget) options.push(entry);
            }
        } catch (err) {
            _didIteratorError = true;
            _iteratorError = err;
        } finally {
            try {
                if (!_iteratorNormalCompletion && _iterator.return) {
                    _iterator.return();
                }
            } finally {
                if (_didIteratorError) {
                    throw _iteratorError;
                }
            }
        }

        if (options.length === 0) break;
        // Pick a monster at random
        var opt = randomChoice(options);
        picks.push(opt.klass);
        budget -= opt.score;
    }
    return picks;
}

/**************/
/* EnterScene */
/**************/

/* A thing to handle the player entering a level. (door opens, player walks
 * through the door, looks around, door closes, level starts) */
function EnterScene(door) {
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

EnterScene.prototype.update = function (dt) {
    if (this.timer > 0) {
        this.timer -= dt;
        return;
    }

    var player = this.level.player;

    switch (this.state) {
        case this.IDLE:
            // Position the player behind the level so they're hidden, and centered 
            // on the door so the camera renders in the right place.
            player.sprite.x = this.door.sprite.x;
            player.sprite.y = this.door.sprite.y + 1;
            player.sprite.zpos = Level.BEHIND_BACKGROUND_POS;
            player.controls = new GameControls.ManualControls();
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
                player.sprite.zpos = undefined;
                this.state = this.PLAYER_ENTERING;
                this.timer = 0.4;
                this.travelTime = 0.6;
            }
            break;

        case this.PLAYER_ENTERING:
            // Player walking some ways into the level
            player.controls.diry = 0.5;
            this.travelTime -= dt;
            if (this.travelTime <= 0) {
                this.state = this.PLAYER_LOOK_LEFT;
                this.timer = 0.5;
                this.door.startClosing();
                player.controls.dirx = 0;
                player.controls.diry = 0;
            } else if (this.travelTime < 0.35) {
                player.controls.dirx = 0.25;
            }
            break;

        case this.PLAYER_LOOK_LEFT:
            player.faceDirection(-1);
            this.state = this.PLAYER_LOOK_RIGHT;
            this.timer = 1;
            break;

        case this.PLAYER_LOOK_RIGHT:
            player.faceDirection(1);
            player.controls = GameControls.getControls();
            this.timer = 0.5;
            // Done!
            this.level.removeThing(this);
            break;
    }
};

/* Functions */

module.exports = {};

module.exports.generate = function (levelNum) {
    // Generate the floor and top wall across the level
    var length = 100;
    var grid = Utils.createGrid(5, length);
    for (var row = 0; row < grid.rows; row++) {
        for (var col = 0; col < grid.cols; col++) {
            var n = Math.random();
            if (n < 0.5) grid[0][col] = "brick_wall_m";else if (n < 0.8) grid[0][col] = "mossy_wall_m";else grid[0][col] = "broken_wall_m";
            grid[row][col] = "smooth_floor_m";
        }
    }

    // Add a random spot of water somewhere
    var w = randint(4, 8);
    var pos = randint(10, grid.cols - 2 - w);
    for (var row = 1; row < grid.rows; row++) {
        for (var col = pos - randint(0, 2); col < pos + w + randint(0, 2); col++) {
            grid[row][col] = "water";
        }
    } // Add random outcropping of wall sections
    var pos = 0;
    if (levelNum === 0) {
        // Leave a large, empty space in the first level to make room for
        // a starter chest and some NPCs
        pos += 10;
    }
    while (true) {
        pos += randint(5, 10);
        // Leave space at the end of the level
        if (pos >= grid.cols - 12) break;

        var w = 1;
        if (Math.random() < 0.5) {
            w = randint(3, 5);
        }
        if (pos + w >= grid.cols) w = 0;

        var depth = randomChoice([1, 1, 2, 2, 3]);
        for (var col = 0; col < w; col++) {
            for (var row = 0; row < depth; row++) {
                if (row == 0) grid[row][pos + col] = "wall_behind";else grid[row][pos + col] = "wall_behind2";
            }
            grid[depth][pos + col] = "smooth_wall_m";
        }
        pos += w;
    }

    // Add a vertical wall to either side of the level
    for (var row = 0; row < grid.rows - 1; row++) {
        grid[row][0] = "wall_behind2";
        grid[row][grid.cols - 1] = "wall_behind2";
    }
    grid[0][0] = "wall_behind";
    grid[0][grid.cols - 1] = "wall_behind";
    grid[grid.rows - 1][0] = "smooth_wall_m";
    grid[grid.rows - 1][grid.cols - 1] = "smooth_wall_m";

    // Build a big sprite for the tiled map
    var bg = new TiledBackground(RES.TILE_WIDTH, RES.TILE_HEIGHT, RES.WALL_HEIGHT, Utils.getTextures(RES.MAPTILES), grid);
    var level = new Level(bg);

    // Now add some random gates throughout the level
    var pos = 0;
    while (true) {
        if (Math.random() < 0.6 && pos > 0) {
            // Find the bottom-most section of wall
            var found = -1;
            for (var row = grid.rows - 1; row >= 0; row--) {
                if (grid[row][pos] && grid[row][pos] !== "wall_behind" && grid[row][pos] !== "wall_behind2" && grid[row][pos].indexOf("wall") !== -1) {
                    found = row;
                    break;
                }
            }
            if (found !== -1) {
                var gate = new Gate();
                gate.sprite.x = pos * RES.TILE_WIDTH;
                gate.sprite.y = found * RES.TILE_HEIGHT;
                level.addThing(gate);
            }
        }
        pos += randint(5, 15);
        if (pos >= grid.cols - 5) break;
    }

    // Break the level down into "arena" sections where the player gets
    // to fight monsters. We start with an arena at the very end of the 
    // level, then work backwards from there.
    var endx = level.getWidth() - 1;
    var arenaWidth = level.camera.width;
    // The starting monster "budget" for this level. Harder monsters cost
    // more and multiples of the same monster may have an additional
    // cost. Each round is populated with monsters that fall within this 
    // budget. This is gradually reduced working backwards through the 
    // level to make earlier rounds a little easier.
    var budget = (levelNum + 1) * 6;
    while (endx > arenaWidth * 1.75) {
        var arena = new Arena.Arena(level, arenaWidth, endx);
        level.addArena(arena);

        // Find the visible gates (for gate spawning below)
        var gates = [];
        var _iteratorNormalCompletion2 = true;
        var _didIteratorError2 = false;
        var _iteratorError2 = undefined;

        try {
            for (var _iterator2 = level.things[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
                var thing = _step2.value;

                if (thing instanceof Gate && thing.sprite.x > arena.startx && thing.sprite.x < arena.endx) {
                    gates.push(thing);
                }
            }

            // Higher levels have more rounds per arena on average
        } catch (err) {
            _didIteratorError2 = true;
            _iteratorError2 = err;
        } finally {
            try {
                if (!_iteratorNormalCompletion2 && _iterator2.return) {
                    _iterator2.return();
                }
            } finally {
                if (_didIteratorError2) {
                    throw _iteratorError2;
                }
            }
        }

        for (var rnum = 0; rnum < randint(2, 4 + levelNum); rnum++) {
            var round = new Arena.Round(randUniform(0.5, 1));
            var monsters = null;

            if (rnum === 0 && levelNum === 0 && endx === level.getWidth() - 1) {
                // Lots of rats!
                monsters = [];
                for (var n = 0; n < randint(10, 20); n++) {
                    monsters.push(Rat);
                }
            } else {
                monsters = chooseMonsters(budget);
            }

            var _iteratorNormalCompletion3 = true;
            var _didIteratorError3 = false;
            var _iteratorError3 = undefined;

            try {
                for (var _iterator3 = monsters[Symbol.iterator](), _step3; !(_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done); _iteratorNormalCompletion3 = true) {
                    var klass = _step3.value;

                    var spawn = null;
                    var ypos = randUniform(0, level.camera.height);
                    var style = randint(1, 5);

                    if (style === 1 && klass !== Ghost) {
                        var xpos = randint(arena.startx + 20, arena.endx - 20);
                        spawn = new Arena.DropSpawn(level, new klass(), xpos, ypos);
                    } else if (style === 2 && gates.length > 0) {
                        spawn = new Arena.GateSpawn(level, new klass(), randomChoice(gates));
                    } else {
                        var xdir = randomChoice([-1, 1]);
                        if (endx >= level.getWidth() - 1) xdir = -1;
                        spawn = new Arena.Spawn(level, new klass(), xdir, ypos);
                    }
                    round.addSpawn(spawn, randUniform(0, 1));
                }
            } catch (err) {
                _didIteratorError3 = true;
                _iteratorError3 = err;
            } finally {
                try {
                    if (!_iteratorNormalCompletion3 && _iterator3.return) {
                        _iterator3.return();
                    }
                } finally {
                    if (_didIteratorError3) {
                        throw _iteratorError3;
                    }
                }
            }

            arena.rounds.push(round);
        }
        // Randomly add a chest into the arena
        if (randint(1, 10) < 7) {
            // Find some clear space to add it
            var xpos = randint(arena.startx + 30, arena.endx - 30);
            var ypos = randint(10, level.getHeight() - 30);

            ypos = level.findClearSpace(xpos, ypos);
            if (ypos !== null) {
                var chest = new Chest(randomTreasures(levelNum));
                chest.sprite.x = xpos;
                chest.sprite.y = ypos;
                level.addThing(chest);
            }
        }
        // Skip some space to the previous arena (working backwards)
        endx -= arenaWidth * randUniform(1, 1.25) | 0;
        // Decrease the monster 'budget' so the arenas are slightly easier
        if (budget > 3) budget--;
    }

    // Add random coins scattered throughout the level
    for (var n = 0; n < randint(10, 20); n++) {
        var xpos = randint(level.camera.width + 10, level.getWidth() - 10);
        var ypos = randint(10, level.getHeight() - 10);
        ypos = level.findClearSpace(xpos, ypos);
        if (ypos !== null) {
            var coin = new GroundItem(Item.Table.COIN, xpos, ypos);
            level.addThing(coin);
        }
    }

    // Add some health potions in the second half of the level
    for (var n = 0; n < randint(1, 5); n++) {
        var xpos = randint(level.getWidth() / 2, level.getWidth() - 10);
        var ypos = randint(10, level.getHeight() - 10);
        ypos = level.findClearSpace(xpos, ypos);
        if (ypos !== null) {
            var coin = new GroundItem(Item.Table.SMALL_HEALTH, xpos, ypos);
            level.addThing(coin);
        }
    }

    if (levelNum === 0) {
        // First level in the game. Add a chest of starter items. Have the 
        // chest eject items to the right away from the first NPC. (so none
        // of the items become hidden behind)
        var items = [Item.Table.COIN, Item.Table.COIN, Item.Table.COIN, Item.Table.SMALL_SWORD];
        var chest = new Chest(items, { ejectX: 1 });
        chest.sprite.x = 60;
        chest.sprite.y = 24;
        level.addThing(chest);

        // Add an NPC to give the player some dialog
        var npc = new NPC();
        npc.setDialog(["TAKE THIS AND", "GO FORTH!!!"]);
        npc.sprite.x = 46;
        npc.sprite.y = 25;
        level.addThing(npc);

        // Add an NPC to give the player some dialog
        var npc = new NPC("npc3_south_1");
        npc.setDialog("GOOD LUCK!");
        npc.sprite.x = 80;
        npc.sprite.y = 40;
        level.addThing(npc);
    }

    // Add a door to enter the level
    var door = new Door();
    door.sprite.x = 20;
    door.sprite.y = 12.8;
    level.addThing(door);

    var scn = new EnterScene(door);
    level.addThing(scn);

    // Add a door to exit the level
    var door = new Door();
    door.sprite.x = level.getWidth() - 24;
    door.sprite.y = 12.8;
    level.exitDoor = door;
    //door.startOpening();
    level.addThing(door);

    return level;
};

module.exports.generateEmpty = function (rows, cols, value) {
    var grid = Utils.createGrid(rows, cols, value);
    var bg = new TiledBackground(RES.TILE_WIDTH, RES.TILE_HEIGHT, RES.WALL_HEIGHT, Utils.getTextures(RES.MAPTILES), grid);
    return new Level(bg);
};

},{"./arena":1,"./bg":3,"./chest":4,"./controls":5,"./door":6,"./gate":9,"./ghost":11,"./goblin":12,"./grounditem":14,"./item":15,"./level":16,"./npc":19,"./res":23,"./skel_warrior":25,"./snake":26,"./utils":30}],11:[function(require,module,exports){
"use strict";

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

var RES = require("./res");
var Utils = require("./utils");
var Thing = require("./thing");
var Item = require("./item");
var Audio = require("./audio");

var GHOST_IDLE = 0;
var GHOST_ATTACKING = 1;
var GHOST_HURT = 2;
var GHOST_DEAD = 3;

function Ghost(state) {
    this.name = "Spectre";
    this.frames = Utils.getFrames(RES.ENEMIES, Ghost.FRAMES);
    this.health = 3;
    this.frame = 0;
    this.facing = 1;
    this.dead = false;
    this.travel = 0;
    this.velx = 0;
    this.vely = 0;
    this.accel = 20;
    this.maxSpeed = 30;
    // The sprite container holding the monster
    this.sprite = new PIXI.Container();
    this.sprite.alpha = 0.75;
    // The actual sprite
    this.ghostSprite = new PIXI.Sprite(this.frames[0]);
    this.ghostSprite.anchor.set(0.5, 6.5 / 8);
    this.sprite.addChild(this.ghostSprite);
    this.knocked = 0;
    this.knockedTimer = 0;
    this.state = state || GHOST_ATTACKING;
    this.hitbox = new Thing.Hitbox(0, 0, 8, 4);
}

Ghost.FRAMES = ["ghost_south_1", "ghost_south_2"];

Ghost.prototype.getDropTable = function () {
    return [[Item.Table.SMALL_HEALTH, 1], [Item.Table.LARGE_HEALTH, 5]];
};

Ghost.prototype.update = function (dt) {
    if (this.state === GHOST_ATTACKING) this.updateAttacking(dt);else if (this.state === GHOST_HURT) this.updateHurt(dt);else if (this.state === GHOST_DEAD) {
        this.level.removeThing(this);
    }
};

Ghost.prototype.updateAttacking = function (dt) {
    var player = this.level.player;
    var accelx = player.sprite.x - this.sprite.x;
    var accely = player.sprite.y - this.sprite.y;
    var mag = Math.sqrt(accelx * accelx + accely * accely);

    accelx = this.accel * accelx / mag;
    accely = this.accel * accely / mag;

    this.velx += accelx * dt + 10 * Math.cos(this.frame) * dt;
    this.vely += accely * dt + 10 * Math.sin(this.frame) * dt;

    var speed = Math.sqrt(this.velx * this.velx + this.vely * this.vely);
    if (speed > this.maxSpeed) {
        this.velx = this.maxSpeed * this.velx / speed;
        this.vely = this.maxSpeed * this.vely / speed;
    }

    this.sprite.x += this.velx * dt; //+Math.cos(this.frame);
    this.sprite.y += this.vely * dt; //+Math.sin(this.frame);

    this.frame += 4 * dt;
    this.ghostSprite.texture = this.frames[this.frame % this.frames.length | 0];
};

Ghost.prototype.updateHurt = function (dt) {
    // Slide backwards from the hit
    if (this.knockedTimer > 0) {
        var dx = this.knocked * dt;
        var tile = this.level.bg.getTileAt(this.sprite.x + dx, this.sprite.y);
        if (!tile.solid) {
            this.sprite.x += dx;
        }
        this.knockedTimer -= dt;
    } else {
        // Resume/start attacking
        this.state = GHOST_ATTACKING;
        this.travel = 0;
    }
};

Ghost.prototype.handleHit = function (srcx, srcy, dmg) {
    var player = this.level.player;
    if (this.state === GHOST_DEAD) return false;
    this.health -= 1;
    if (this.health <= 0) {
        Audio.playSound(RES.DEAD_SND);
        this.state = GHOST_DEAD;
        // Drop a reward
        this.level.handleTreasureDrop(this.getDropTable(), this.sprite.x, this.sprite.y);
        player.handleMonsterKilled(this);
        this.dead = true;
    } else {
        Audio.playSound(RES.SNAKE_HURT_SND);
        this.knocked = Math.sign(this.sprite.x - srcx) * 100;
        this.knockedTimer = 0.1;
        this.state = GHOST_HURT;
    }
    return true;
};

Ghost.prototype.handlePlayerCollision = function (player) {
    player.takeDamage(4, this);
};

module.exports = Ghost;

},{"./audio":2,"./item":15,"./res":23,"./thing":27,"./utils":30}],12:[function(require,module,exports){
"use strict";

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

var RES = require("./res");
var Utils = require("./utils");
var Thing = require("./thing");
var Item = require("./item");
var Audio = require("./audio");

var GOBLIN_IDLE = 0;
// Approaching the player, but keeping a distance away
var GOBLIN_APPROACH = 1;
// Rushing the player to attack
var GOBLIN_ATTACKING = 2;
// Initiates a jump at the player (transitional state)
var GOBLIN_START_JUMP = 3;
// Jumping at the player to attack
var GOBLIN_JUMPING = 4;
// Knocked back
var GOBLIN_HURT = 5;
var GOBLIN_DEAD = 6;

// The goblin's vertical acceleration when falling (after jumping) pixels/s/s
var GOBLIN_GRAVITY = 200;

/* The goblin keeps their distance while the player is facing them, and 
 * quickly approaches to attack when the player's back is turned */
function Goblin(state) {
    this.name = "Goblin";
    this.idleFrame = Utils.getFrame(RES.ENEMIES, "goblin_south_1");
    this.frames = Utils.getFrames(RES.ENEMIES, Goblin.FRAMES);
    this.speed = 14;
    this.health = 3;
    this.frame = 0;
    this.facing = 1;
    // The horizontal and vertical jumping speeds
    this.jumpVerSpeed = 50;
    this.jumpHorSpeed = 24;
    this.dead = false;
    // How high we're off the ground (when jumping)
    this.height = 0;
    // Our Y-position when we started jumping
    this.jumpStartY = 0;
    // Our current vertical velocity (when jumping)
    this.velh = 0;
    // When approaching the player, how far to keep distance
    this.approachDist = 30;
    // At what distance to the player we should do our jump attack
    this.jumpDist = 20;
    // When in the approach state, used to determine when to jump at the player
    this.jumpTimeout = 1.5;
    this.jumpTimer = 0;
    // The sprite container holding the monster and splash sprite
    this.sprite = new PIXI.Container();
    // The actual goblin sprite
    this.goblinSprite = new PIXI.Sprite(this.frames[0]);
    this.goblinSprite.anchor.set(0.5, 6.5 / 8);
    this.sprite.addChild(this.goblinSprite);
    // Make the splash/water sprite
    this.waterSprite = Utils.createSplashSprite();
    this.waterSprite.y = -0.75;
    this.sprite.addChild(this.waterSprite);
    this.knocked = 0;
    this.knockedTimer = 0;
    this.state = state || GOBLIN_APPROACH;
    this.hitbox = new Thing.Hitbox(0, -1, 6, 6);
}

Goblin.FRAMES = ["goblin_south_2", "goblin_south_3"];

Goblin.prototype.getDropTable = function () {
    return [[Item.Table.COIN, 8], [Item.Table.SMALL_HEALTH, 6], [Item.Table.ARROW, 4], [Item.Table.STEEL_ARMOUR, 1], [Item.Table.LARGE_BOW, 1]];
};

Goblin.prototype.update = function (dt) {
    switch (this.state) {
        case GOBLIN_ATTACKING:
            this.updateAttacking(dt);
            break;
        case GOBLIN_START_JUMP:
            // Jump at the player
            this.sprite.zpos = this.sprite.y;
            this.height = 0;
            this.jumpStartY = this.sprite.y;
            this.velh = this.jumpVerSpeed;
            this.waterSprite.visible = false;
            this.state = GOBLIN_JUMPING;
            break;
        case GOBLIN_JUMPING:
            this.updateJumping(dt);
            break;
        case GOBLIN_APPROACH:
            this.updateApproach(dt);
            break;
        case GOBLIN_HURT:
            this.updateHurt(dt);
            break;
        case GOBLIN_DEAD:
            this.level.removeThing(this);
            break;
    }
};

Goblin.prototype.updateJumping = function (dt) {
    this.velh -= GOBLIN_GRAVITY * dt;
    this.height += this.velh * dt;
    if (this.height <= 0) {
        // Hit the ground. Go back to carefully approaching the player. Also
        // we snap the Y-position to the ground to avoid cumulative rounding
        // errors if we jump repeatedly.
        this.sprite.y = this.jumpStartY;
        this.state = GOBLIN_APPROACH;
        return;
    }
    this.sprite.y = this.jumpStartY - this.height;

    // Check if we can move where we want to
    var x = this.sprite.x + this.facing * this.jumpHorSpeed * dt;
    var tile = this.level.bg.getTileAt(x, this.jumpStartY);
    if (!tile.solid) {
        this.sprite.x = x;
    }
};

Goblin.prototype.updateAttacking = function (dt) {
    // Rush towards the player
    var player = this.level.player;
    var dx = 0,
        dy = 0;

    if (player.sprite.x > this.sprite.x) {
        dx = 1.5 * this.speed * dt;
        this.facing = 1;
    } else {
        dx = -1.5 * this.speed * dt;
        this.facing = -1;
    }
    this.sprite.scale.x = this.facing * Math.abs(this.sprite.scale.x);

    // Go back to a careful approach if the player is facing us (note the
    // goblin always faces the player)
    if (player.getFacing() * this.facing < 0) {
        this.state = GOBLIN_APPROACH;
        return;
    }

    if (Math.abs(this.sprite.x - player.sprite.x) < this.jumpDist) {
        this.state = GOBLIN_START_JUMP;
        return;
    }

    // Move up/down towards the player more slowly (and don't overshoot)
    var dist = player.sprite.y - this.sprite.y;
    if (Math.abs(dist) > 5) {
        dy = dt * 20 * Math.sign(dist);
    }

    // Check if we can move left/right
    var tile = this.level.bg.getTileAt(this.sprite.x + dx, this.sprite.y);
    if (!tile.solid) {
        this.sprite.x += dx;
        this.waterSprite.visible = tile.water;
    }

    // Now check if it can move up/down. Doing this separately from the check
    // above means we can "slide" along walls and such.
    var tile2 = this.level.bg.getTileAt(this.sprite.x, this.sprite.y + dy);
    if (!tile2.solid) {
        // Go a bit faster if we're just moving up/down
        if (tile.solid) this.sprite.y += 3 * dy;else {
            this.sprite.y += dy;
            this.waterSprite.visible = tile2.water;
        }
    }
    this.frame += 4 * dt;
    this.goblinSprite.texture = this.frames[this.frame % this.frames.length | 0];
};

Goblin.prototype.updateApproach = function (dt) {
    // Move towards the player, but try to keep a fixed distance away. 
    // Initially the target is set to the player's position, plus/minus
    // a fixed offset.
    var player = this.level.player;
    var targetx = 0;

    if (this.sprite.x < player.sprite.x) {
        targetx = player.sprite.x - this.approachDist;
        this.facing = 1;
    } else if (this.sprite.x > player.sprite.x) {
        targetx = player.sprite.x + this.approachDist;
        this.facing = -1;
    }
    this.sprite.scale.x = this.facing * Math.abs(this.sprite.scale.x);

    // Rush the player for an attack, if they're facing away from us
    // (note the goblin always faces the player)
    if (player.getFacing() * this.facing > 0) {
        this.state = GOBLIN_ATTACKING;
        return;
    }

    this.jumpTimer += dt;
    if (this.jumpTimer > this.jumpTimeout) {
        this.jumpTimer = 0;
        this.state = GOBLIN_START_JUMP;
        return;
    }

    // Add a bit of variation to the target position, so the goblin kind of
    // waivers back and forth making it a bit harder to hit.
    var dx = 0;
    var dy = 0;
    targetx += 15 * Math.cos(this.frame / 4);
    if (Math.abs(this.sprite.x - targetx) > 2) {
        dx = this.speed * dt * Math.sign(targetx - this.sprite.x);
    }

    // Move up/down towards the player more slowly (and don't overshoot)
    var dist = player.sprite.y + 50 * Math.sin(this.frame / 2) - this.sprite.y;
    if (Math.abs(dist) > 2) {
        dy = dt * 30 * Math.sign(dist);
    }
    // Check if we can move where we want to
    var tile = this.level.bg.getTileAt(this.sprite.x + dx, this.sprite.y + dy);
    if (!tile.solid) {
        this.sprite.x += dx;
        this.sprite.y += dy;
        this.waterSprite.visible = tile.water;
    }
    this.frame += 4 * dt;
    this.goblinSprite.texture = this.frames[this.frame % this.frames.length | 0];
};

Goblin.prototype.updateHurt = function (dt) {
    // Slide backwards from the hit
    if (this.knockedTimer > 0) {
        var dx = this.knocked * dt;
        var tile = this.level.bg.getTileAt(this.sprite.x + dx, this.sprite.y);
        if (!tile.solid) {
            this.sprite.x += dx;
        }
        this.knockedTimer -= dt;
    } else {
        // Resume/start attacking
        this.state = GOBLIN_APPROACH;
        // Also increase the rate of jumping at the player (when approaching)
        this.jumpTimeout *= 0.5;
    }
};

Goblin.prototype.handleHit = function (srcx, srcy, dmg) {
    var player = this.level.player;

    if (this.state === GOBLIN_DEAD) return false;
    this.health -= 1;
    if (this.health <= 0) {
        Audio.playSound(RES.DEAD_SND);
        this.state = GOBLIN_DEAD;
        // Drop a reward
        this.level.handleTreasureDrop(this.getDropTable(), this.sprite.x, this.sprite.y);
        player.handleMonsterKilled(this);
        this.dead = true;
    } else {
        Audio.playSound(RES.SNAKE_HURT_SND);
        this.knocked = Math.sign(this.sprite.x - srcx) * 60;
        this.knockedTimer = 0.1;
        this.state = GOBLIN_HURT;
    }

    // Add some random blood, but only if we're not currently in water
    // (looks better this way)
    var tile = this.level.bg.getTileAt(this.sprite.x, this.sprite.y);
    if (!tile.water) {
        this.level.createBloodSpatter(this.sprite.x, this.sprite.y - 1);
    }
    return true;
};

Goblin.prototype.handlePlayerCollision = function (player) {
    player.takeDamage(2, this);
};

module.exports = Goblin;

},{"./audio":2,"./item":15,"./res":23,"./thing":27,"./utils":30}],13:[function(require,module,exports){
"use strict";

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

var RES = require("./res");
var Utils = require("./utils");
var Audio = require("./audio");

/* TODO - this code would be cleaner if we implemented an event queue/message
 * passing system. The level instance could broadcast changes in it's state,
 * (eg wait-to-advance) which would be picked up by the go marker, who could
 * then change it's appearance accordingly (eg play go animation) */

function GoMarker(screen) {
    this.screen = screen;
    this.frames = [Utils.getFrame(RES.UI, "go1"), Utils.getFrame(RES.UI, "go2")];
    this.sprite = new PIXI.Sprite(this.frames[0]);
    this.sprite.anchor.set(1, 0);
    this.timer = 0;
    this.dings = 3;
    this.frameNum = 0;
    this.done = true;
    this.sprite.visible = false;
}

GoMarker.prototype.show = function () {
    this.done = false;
    this.timer = 0;
    this.dings = 3;
    this.frameNum = 0;
    this.sprite.visible = true;
    this.sprite.texture = this.frames[0];
};

GoMarker.prototype.hide = function () {
    this.done = true;
    this.sprite.visible = false;
};

GoMarker.prototype.update = function (dt) {
    var level = this.screen.level;
    if (!this.sprite.visible) {
        // Become visible if the level is ready to advance to the next arena
        if (level.state === level.SHOWING_GO) {
            this.show();
        }
        return;
    }

    if (this.done) {
        // Hide when the player is advancing to the next arena
        if (level.state !== level.SHOWING_GO) {
            this.hide();
        }
        return;
    }

    var next = this.timer + dt;
    if (this.timer < 0.3 && next >= 0.3) {
        if (this.dings-- > 0) Audio.playSound(RES.GO_SND);else this.done = true;
        this.frameNum = 1;
    } else if (this.timer < 1 && next >= 1) {
        this.frameNum = 0;
        next = 0;
    }
    this.timer = next;
    this.sprite.texture = this.frames[this.frameNum];
};

GoMarker.prototype.handleHit = function (x, y, dmg) {};

GoMarker.prototype.handlePlayerCollision = function (player) {};

module.exports = GoMarker;

},{"./audio":2,"./res":23,"./utils":30}],14:[function(require,module,exports){
"use strict";

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

var RES = require("./res");
var Utils = require("./utils");
var Thing = require("./thing");

var ITEM_GRAVITY = 120;

/**************/
/* GroundItem */
/**************/

function GroundItem(item, x, y) {
    var img = Utils.getFrame(RES.GROUND_ITEMS, item.image);
    this.sprite = new PIXI.Sprite(img);
    this.sprite.anchor.set(0.5, 0.6);
    this.height = 0;
    this.sprite.x = x;
    this.sprite.y = y;
    this.ypos = y;
    this.item = item;
    // Make the render depth fixed here, otherwise as the item bounces it
    // will seem like it's moving back into the scene. (ie disappears behind
    // other sprites)
    this.sprite.zpos = y;
    this.velx = 0;
    this.velz = 0;
    this.velh = 0;
    this.bouncy = 0.5;
    this.hitbox = new Thing.Hitbox(0, 0, 5, 5);
}

GroundItem.prototype.update = function (dt) {
    if (this.velh !== 0) {
        // First move the item into/out of the scene (Z-axis) and make sure
        // we don't bump into anything.
        if (this.velz !== 0) {
            var dz = this.velz * dt;
            var tile = this.level.bg.getTileAt(this.sprite.x, this.ypos + dz);
            // If we connect with a wall, don't bother bouncing off
            if (tile.solid) this.velz = 0;else {
                this.ypos += dz;
                this.sprite.zpos += dz;
            }
        }

        // Move the item left/right having it bounce off walls too. Note we
        // check the "floor" position of the item instead of the sprite pos.
        var dx = this.velx * dt;
        var tile = this.level.bg.getTileAt(this.sprite.x + dx, this.ypos);
        if (tile.solid) {
            this.velx *= -1;
        } else {
            this.sprite.x += dx;
        }
        this.velh += ITEM_GRAVITY * dt;
        this.height -= this.velh * dt;

        // Have the item bounce up/down until it comes to rest
        if (this.height <= 0) {
            if (this.velh < 10) {
                this.velh = 0;
            } else {
                this.velh *= -this.bouncy;
                this.height = 0;
            }
        }
        this.sprite.y = this.ypos - this.height;
    }
};

GroundItem.prototype.handlePlayerCollision = function (player) {
    // The player takes the item if it's falling down (or resting) and close
    // enough to the ground.
    if (this.height < 3 && this.velh >= 0) {
        if (this.item && player.handleTakeItem(this.item)) {
            this.level.removeThing(this);
        }
    }
};

module.exports = GroundItem;

},{"./res":23,"./thing":27,"./utils":30}],15:[function(require,module,exports){
"use strict";

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

var RES = require("./res");
var Utils = require("./utils");

/*********/
/* Items */
/*********/

function Item(image, type, quality) {
    this.image = image;
    this.type = type;
    this.quality = quality;
};

Item.prototype.isBetter = function (other) {
    return this.quality > other.quality;
};

Item.prototype.isArmour = function () {
    return this.type === Item.ARMOUR;
};

Item.prototype.isSword = function () {
    return this.type === Item.SWORD;
};

Item.prototype.isBow = function () {
    return this.type === Item.BOW;
};

// The various item types
Item.OTHER = 0;
Item.SWORD = 1;
Item.BOW = 2;
Item.ARMOUR = 3;
Item.HEALTH = 4;

// The list of takeable items. The values here are used to identify the items
// as well as referring to images on the GROUND_ITEMS sprite sheet.
Item.Table = {
    NO_ARMOUR: new Item("helmet3", Item.ARMOUR, 0),
    LEATHER_ARMOUR: new Item("helmet1", Item.ARMOUR, 1),
    STEEL_ARMOUR: new Item("helmet2", Item.ARMOUR, 2),
    COIN: new Item("coin", Item.OTHER, 0),
    SMALL_HEALTH: new Item("small_health", Item.HEALTH, 0),
    LARGE_HEALTH: new Item("large_health", Item.HEALTH, 1),
    SMALL_BOW: new Item("bow1", Item.BOW, 0),
    LARGE_BOW: new Item("bow2", Item.BOW, 1),
    NO_BOW: new Item("bow3", Item.BOW, 2),
    ARROW: new Item("arrow1", Item.OTHER, 0),
    NO_SWORD: new Item("sword4", Item.SWORD, 0),
    SMALL_SWORD: new Item("sword1", Item.SWORD, 1),
    LARGE_SWORD: new Item("sword2", Item.SWORD, 2),
    MAGIC_SWORD: new Item("sword3", Item.SWORD, 3),
    NONE: new Item(null, Item.OTHER, 0)
};

module.exports = Item;

},{"./res":23,"./utils":30}],16:[function(require,module,exports){
"use strict";

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

var RES = require("./res");
var Utils = require("./utils");
var Render = require("./render");
var LevelGenerator = require("./genlevel");
var GroundItem = require("./grounditem");

/**********/
/* Camera */
/**********/

function Camera(w, h) {
    this.x = 0;
    this.y = 0;
    this.width = w;
    this.height = h;
}

//Camera.autoFit

/*********/
/* Level */
/*********/

// Helper function for sorting sprites by depth, so sprites in the backround
// are drawn below sprites in the foreground.
function compareDepth(s1, s2) {
    var z1 = s1.zpos || s1.y;
    var z2 = s2.zpos || s2.y;
    return (z1 > z2) - (z2 > z1);
}

function Level(bg) {
    // The various level states:
    // Player is within an active arena
    this.ACTIVE_ARENA = 1;
    // Showing the go arrow, indicating the player should advance forward
    this.SHOWING_GO = 2;
    // Player is moving towards next arena (not active yet)
    this.NEXT_ARENA = 3;
    // All monsters defeated - exit is open
    this.EXIT_OPEN = 4;
    // Player has passed through the exit
    this.FINISHED = 5;

    this.camera = new Camera(Level.CAMERA_WIDTH, Level.CAMERA_HEIGHT);
    this.player = null;
    this.state = this.NEXT_ARENA;
    // The background sprite (TiledBackground)
    this.bg = bg;
    this.bg.zpos = Level.BACKGROUND_POS;
    // List of enemies, interactable objects etc and the player
    this.things = [];
    // The PIXI container for everything we want to draw
    this.stage = new PIXI.Container();
    this.stage.addChild(this.bg.sprite);
    // List of arenas in this level (Arena instances)
    this.arenas = [];
    // Current active arena (number)
    this.arenaNum = 0;
    this.smoothTracking = true;
    this.exitDoor = null;
}

Level.BEHIND_BACKGROUND_POS = -1;
Level.BACKGROUND_POS = 0;
Level.FLOOR_POS = 1;
Level.FRONT_POS = 10000;

Level.CAMERA_WIDTH = 100;
Level.CAMERA_HEIGHT = 60;

// Returns the width of the level in pixels (ie render size)
Level.prototype.getWidth = function () {
    return this.bg.sprite.width;
};

// Returns the height of the level in pixels (ie render size)
Level.prototype.getHeight = function () {
    return this.bg.sprite.height;
};

/* Find some clear space to spawn a thing at the given location. This code
 * looks up/down until it finds the first pixel of free space. Returns the
 * y-position of that free space. */
Level.prototype.findClearSpace = function (x, y) {
    var offset = 0;
    while (true) {
        var north = this.bg.getTileAt(x, y + offset);
        var south = this.bg.getTileAt(x, y - offset);
        if (!north.solid) {
            return y + offset;
        }
        if (!south.solid) {
            return y - offset;
        }
        if (y + offset > this.getHeight() && y - offset < 0) {
            // We've gone completely outside the level - no space found
            return null;
        }
        offset += RES.TILE_HEIGHT;
    }
};

/* Adds an arena to this level. This function also maintains the correct
 * ordering of arenas sorted by ending position. */
Level.prototype.addArena = function (arena) {
    this.arenas.push(arena);
    this.arenas.sort(function (a1, a2) {
        return (a1.endx > a2.endx) - (a2.endx > a1.endx);
    });
};

// Called every frame to update the general level state
Level.prototype.update = function (dt) {
    var arena = this.arenas[this.arenaNum];
    switch (this.state) {
        case this.ACTIVE_ARENA:
            // Wait for the current arena to be finished (ie player defeats 
            // all the monsters)
            if (arena.done) {
                if (this.arenaNum < this.arenas.length - 1) {
                    // Show the "go forward" marker
                    //gamestate.screen.goMarker.show();
                    // Advance to the next arena
                    this.arenaNum++;
                    this.state = this.SHOWING_GO;
                } else {
                    // No more arenas - open the exit door
                    this.state = this.EXIT_OPEN;
                    if (this.exitDoor) this.exitDoor.startOpening();
                }
            } else {
                arena.update(dt);
            }
            // Update the camera - the player has full mobility within the 
            // start and stop bounds of the arena.
            //var xpos = this.player.sprite.x - this.camera.width/2;
            //xpos = Math.max(xpos, arena.startx);
            //xpos = Math.min(xpos, arena.endx-this.camera.width);
            break;

        case this.SHOWING_GO:
            // Wait for the player to move the level forward by "pushing" the
            // edge of the screen.
            if (this.player.sprite.x > this.camera.x + this.camera.width * 0.8) {
                this.state = this.NEXT_ARENA;
                this.smoothTracking = true;
            }
            break;

        case this.NEXT_ARENA:
            // Update the camera to track the player. Have the camera move
            // smoothly towards the player to avoid jumping around.
            var xpos = this.player.sprite.x - this.camera.width / 2;
            xpos = Math.max(xpos, 0);
            xpos = Math.min(xpos, this.bg.sprite.width - this.camera.width);
            if (this.smoothTracking) {
                var dirx = Math.sign(xpos - this.camera.x);
                this.camera.x += dt * 1.25 * this.player.maxSpeed * dirx;
                if (dirx != Math.sign(xpos - this.camera.x)) {
                    // Overshot the target, stop smoothly tracking
                    this.smoothTracking = false;
                }
            } else {
                this.camera.x = xpos;
            }

            // Also remove the go marker (if it's done animated) since the player
            // already knows to move forward by now.
            /*if (gamestate.screen.goMarker.sprite.visible && 
              gamestate.screen.goMarker.done) {
              gamestate.screen.goMarker.hide();
              }*/

            // Wait for the player to move into the next arena
            if (arena && this.camera.x + this.camera.width >= arena.endx) {
                // Snap the camera into place and activate the next arena
                this.camera.x = arena.endx - this.camera.width;
                arena.activate();
                this.state = this.ACTIVE_ARENA;
                // If somehow the go marker is sticking around (maybe the player
                // is moving _really_ fast) remove it now, done or not.
                /*if (gamestate.screen.goMarker.sprite.visible) {
                  gamestate.screen.goMarker.hide();
                  }*/
            }
            break;

        case this.EXIT_OPEN:
            break;

    }

    // TODO - this could be better optimized by despawning things that are
    // no longer visible. (ie blood spatters etc)

    // Re-sort the sprites by Z-depth so things are rendered in the correct
    // order.
    this.stage.children.sort(compareDepth);
    // Position the camera
    this.stage.x = -this.camera.x;
    this.stage.y = -this.camera.y;
    // Update everything in the level
    var _iteratorNormalCompletion = true;
    var _didIteratorError = false;
    var _iteratorError = undefined;

    try {
        for (var _iterator = this.things[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
            var thing = _step.value;

            if (thing.update) thing.update(dt);
        }
    } catch (err) {
        _didIteratorError = true;
        _iteratorError = err;
    } finally {
        try {
            if (!_iteratorNormalCompletion && _iterator.return) {
                _iterator.return();
            }
        } finally {
            if (_didIteratorError) {
                throw _iteratorError;
            }
        }
    }
};

/* Check if the given hitbox, at the given position, overlaps with any thing 
 * in the level. Can also supply a thing to ignore when making the check. 
 * This function is used to determine if a projectile strikes a target. */
Level.prototype.checkHit = function (x, y, hitbox, ignore) {
    var xp = x + hitbox.x,
        yp = y + hitbox.y;
    var w = hitbox.w,
        h = hitbox.h;
    //var thing = null;
    //for (var n = 0; n < this.things.length; n++) 
    var _iteratorNormalCompletion2 = true;
    var _didIteratorError2 = false;
    var _iteratorError2 = undefined;

    try {
        for (var _iterator2 = this.things[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
            var thing = _step2.value;

            //thing = this.things[n];
            if (thing !== ignore && thing.sprite && thing.hitbox && thing.hitbox !== hitbox && Math.abs(xp - thing.sprite.x - thing.hitbox.x) < (w + thing.hitbox.w) / 2 && Math.abs(yp - thing.sprite.y - thing.hitbox.y) < (h + thing.hitbox.h) / 2) {
                return thing;
            }
        }
    } catch (err) {
        _didIteratorError2 = true;
        _iteratorError2 = err;
    } finally {
        try {
            if (!_iteratorNormalCompletion2 && _iterator2.return) {
                _iterator2.return();
            }
        } finally {
            if (_didIteratorError2) {
                throw _iteratorError2;
            }
        }
    }

    return null;
};

/* Iterates over all things in this level, and calls the given function
 * for each thing that overlaps with the given hitbox. */
Level.prototype.forEachThingHit = function (x, y, hitbox, ignore, callback) {
    var xp = x + hitbox.x;
    var yp = y + hitbox.y;
    var w = hitbox.w;
    var h = hitbox.h;

    var _iteratorNormalCompletion3 = true;
    var _didIteratorError3 = false;
    var _iteratorError3 = undefined;

    try {
        for (var _iterator3 = this.things[Symbol.iterator](), _step3; !(_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done); _iteratorNormalCompletion3 = true) {
            var thing = _step3.value;

            if (thing !== ignore && thing.sprite && thing.hitbox && thing.hitbox !== hitbox && Math.abs(xp - thing.sprite.x - thing.hitbox.x) < (w + thing.hitbox.w) / 2 && Math.abs(yp - thing.sprite.y - thing.hitbox.y) < (h + thing.hitbox.h) / 2) {
                callback(thing);
            }
        }
    } catch (err) {
        _didIteratorError3 = true;
        _iteratorError3 = err;
    } finally {
        try {
            if (!_iteratorNormalCompletion3 && _iterator3.return) {
                _iterator3.return();
            }
        } finally {
            if (_didIteratorError3) {
                throw _iteratorError3;
            }
        }
    }
};

Level.prototype.checkSolidAt = function (x, y, width) {
    var left = this.bg.getTileAt(x - width / 2, y);
    var right = this.bg.getTileAt(x + width / 2, y);
    return left.solid || right.solid;
};

// Add a 'thing' to the level and it's sprite to the render stage
Level.prototype.addThing = function (thing) {
    thing.level = this;
    this.things.push(thing);
    if (thing.sprite) {
        this.stage.addChild(thing.sprite);
    }
};

// Remove a 'thing' remove the level and it's sprite from the stage
Level.prototype.removeThing = function (thing) {
    var i = this.things.indexOf(thing);
    if (i >= 0) {
        this.things[i] = this.things[this.things.length - 1];
        this.things.pop();
        thing.level = null;
    }

    if (thing.sprite && thing.sprite.parent) {
        thing.sprite.parent.removeChild(thing.sprite);
    }
};

Level.prototype.handleTreasureDrop = function (table, x, y) {
    // Pick an item entry from the table, using a weighted probability pick
    // Entries look like: [item_number, weight]. First sum all the weights
    // and pick a random number up to that total.
    var total = 0;
    var _iteratorNormalCompletion4 = true;
    var _didIteratorError4 = false;
    var _iteratorError4 = undefined;

    try {
        for (var _iterator4 = table[Symbol.iterator](), _step4; !(_iteratorNormalCompletion4 = (_step4 = _iterator4.next()).done); _iteratorNormalCompletion4 = true) {
            var entry = _step4.value;

            total += entry[1];
        }
        // Pick a random number, then iterate over the items and find what 
        // item it corresponds to.
    } catch (err) {
        _didIteratorError4 = true;
        _iteratorError4 = err;
    } finally {
        try {
            if (!_iteratorNormalCompletion4 && _iterator4.return) {
                _iterator4.return();
            }
        } finally {
            if (_didIteratorError4) {
                throw _iteratorError4;
            }
        }
    }

    var pick = null;
    var num = Utils.randint(0, total);
    var _iteratorNormalCompletion5 = true;
    var _didIteratorError5 = false;
    var _iteratorError5 = undefined;

    try {
        for (var _iterator5 = table[Symbol.iterator](), _step5; !(_iteratorNormalCompletion5 = (_step5 = _iterator5.next()).done); _iteratorNormalCompletion5 = true) {
            var _entry = _step5.value;

            num -= _entry[1];
            if (num <= 0) {
                pick = _entry[0];
                break;
            }
        }
        // Drop the item
    } catch (err) {
        _didIteratorError5 = true;
        _iteratorError5 = err;
    } finally {
        try {
            if (!_iteratorNormalCompletion5 && _iterator5.return) {
                _iterator5.return();
            }
        } finally {
            if (_didIteratorError5) {
                throw _iteratorError5;
            }
        }
    }

    if (pick !== null) {
        var gnd = new GroundItem(pick, x, y);
        gnd.velx = 10 * (x > this.camera.x ? -1 : 1);
        gnd.velh = -40;
        this.addThing(gnd);
    }
};

Level.prototype.createBloodSpatter = function (x, y, imgs) {
    var txt = Utils.randomChoice(imgs || ["blood1", "blood2", "blood3"]);
    var sprite = new PIXI.Sprite(Utils.getFrame(RES.MAPTILES, txt));
    sprite.zpos = Level.FLOOR_POS;
    sprite.anchor.set(0.5, 0.5);
    sprite.x = x;
    sprite.y = y;
    this.stage.addChild(sprite);
    return sprite;
};

module.exports = Level;

},{"./genlevel":10,"./grounditem":14,"./render":22,"./res":23,"./utils":30}],17:[function(require,module,exports){
"use strict";

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

var Render = require("./render");
var UI = require("./ui");
var LevelGenerator = require("./genlevel");
var GoMarker = require("./gomarker");
var Player = require("./player");
var Level = require("./level");
var Utils = require("./utils");
var GameControls = require("./controls");
var Audio = require("./audio");

/***************/
/* LevelScreen */
/***************/

/* A container for holding screen-related stuff for playing a level. This
 * includes the level itself, PIXI container (staging area for rendering),
 * and the UI elements. (health bar, etc) */
function LevelScreen() {
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
    this.gameUI = new UI.GameUI();
    this.stage.addChild(this.goMarker.sprite);
    this.stage.addChild(this.gameUI.container);

    window.addEventListener("resize", function () {
        //div.style.width = window.innerWidth;
        //div.style.height = window.innerHeight;
        //Render.configure(div);
    });
}

LevelScreen.getAspectRatio = function () {
    return Level.CAMERA_WIDTH / Level.CAMERA_HEIGHT;
};

LevelScreen.prototype.update = function (dt) {
    switch (this.state) {
        case this.NEW_GAME:
            // Generate a new level and player character
            this.player = new Player(GameControls.getControls());
            this.player.sprite.x = 0;
            this.player.sprite.y = 0;
            this.levelNum = 0;
            // Auto-generate the first level
            var level = LevelGenerator.generate(this.levelNum);
            this.setLevel(level);
            // Start playing it immediately
            this.state = this.PLAYING;
            Audio.startMusic();
            break;

        case this.PLAYING:
            if (this.level.state === this.level.FINISHED) {
                // Proceed to the next level
                var _level = LevelGenerator.generate(++this.levelNum);
                this.setLevel(_level);
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
};

LevelScreen.prototype.render = function () {
    if (this.level) {
        Render.getRenderer().render(this.stage);
    }
};

LevelScreen.prototype.setLevel = function (level) {
    // Remove the previous level sprite container
    if (this.level) {
        this.stage.removeChild(this.level.stage);
    }
    if (!level) return;

    // Add the level (container) sprite to the start of the list of
    // child sprites, so it gets rendered before anything else.
    // (ie UI elements are drawn on top of the level)
    this.stage.addChildAt(level.stage, 0);
    this.level = level;

    this.gameUI.setPlayer(this.player);
    this.gameUI.doLayout(0, level.getHeight(), level.camera.width, level.camera.height - level.getHeight());

    // Put the go marker in the top-right corner of the level area
    this.goMarker.sprite.x = level.camera.width - 1;
    this.goMarker.sprite.y = 2;
    this.level.player = this.player;
    this.level.addThing(this.player);
    this.level.update(0);
    this.gameUI.update(0);

    this.handleResize();
};

LevelScreen.prototype.handleResize = function () {
    if (this.level) {
        var scale = Math.min(Render.getRenderer().width / this.level.camera.width, Render.getRenderer().height / this.level.camera.height);
        this.stage.scale.set(scale);
    }
};

module.exports = LevelScreen;

},{"./audio":2,"./controls":5,"./genlevel":10,"./gomarker":13,"./level":16,"./player":20,"./render":22,"./ui":29,"./utils":30}],18:[function(require,module,exports){
"use strict";

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

var RES = require("./res");
var Render = require("./render");
var ProgressBar = require("./progress");
var GameControls = require("./controls");
var LevelScreen = require("./levelscreen");
var GameState = require("./gamestate");
var Utils = require("./utils");
//require("./contrib/sound.js");

var gamestate = null;
var stage = null;
var progress = null;

/* TODO - the game is implemented as a big loop where 'update' is called on
 * the level every iteration before painting the screen. (in term the level
 * calls 'update' on all things in the level, plus arena controllers, etc.
 * This could be better implemented as an event loop, where things queue
 * up events for callback later, issue broadcast events etc. This has the
 * benefit where entities that don't need to do anything (eg blood spatter),
 * or objects waiting for a trigger (eg door) don't waste processor time */

var lastCheck = 0;
var fps = 0;
var lastTime = null;
function gameLoop() {
    var now = new Date().getTime() / 1000.0;
    var dt = 0;
    if (lastTime) {
        var dt = Math.min(1.0 / 30, now - lastTime);
        //dt /= 4;
    }
    lastTime = now;

    fps++;
    if (now - lastCheck >= 2) {
        //console.log(fps/(now-lastCheck));
        lastCheck = now;
        fps = 0;
    }

    gamestate.update(dt);
    GameControls.update();
    gamestate.render();
    requestAnimationFrame(gameLoop);
}

function graphicsLoaded() {
    sounds.whenLoaded = audioLoaded;
    sounds.onFailed = function (source) {
        console.log("Failed to load audio file: " + source);
    };
    // Show and update the new progress bar for loading audio
    progress.setText("LOADING AUDIO...");
    sounds.onProgress = function (percent) {
        progress.update(percent / 100.0);
        requestAnimationFrame(function () {
            Render.getRenderer().render(stage);
        });
    };
    sounds.load([RES.ATTACK_SWORD_SND, RES.SNAKE_HURT_SND, RES.DEAD_SND, RES.ARROW_DING_SND, RES.SPLASH_SND, RES.GO_SND, RES.HIT_SND, RES.COIN_SND, RES.GATE_SND, RES.DROP_SND, RES.POWERUP1_SND, RES.POWERUP2_SND, RES.POWERUP3_SND, RES.POWERUP4_SND, RES.CHEST_SND, RES.GAME_MUSIC]);
}

function audioLoaded() {
    /* TODO - error handling here */
    setup();
}

function setup() {
    for (name in PIXI.loader.resources) {
        var err = PIXI.loader.resources[name].error;
        if (err) {
            console.log("Failed to load image: " + name + " (" + err + ")");
        }
    }

    //stage.removeChild(progress.sprite);
    stage.children = [];
    requestAnimationFrame(gameLoop);
}

module.exports = {};
module.exports.start = function (elementName) {
    var div = document.getElementById(elementName);
    div.focus();

    // Use the level screen to determine what the render view aspect
    // ratio should be.
    Render.configure(div, LevelScreen.getAspectRatio());

    stage = new PIXI.Container();
    progress = new ProgressBar(200, 20, "LOADING IMAGES...");
    progress.sprite.x = 100;
    progress.sprite.y = 100;
    stage.addChild(progress.sprite);

    GameControls.configure();

    gamestate = new GameState();

    function progresscb(loader, resource) {
        console.log("loading: " + resource.url + " (" + (loader.progress | 0) + "%)");
        progress.update(loader.progress / 100.0);
        requestAnimationFrame(function () {
            Render.getRenderer().render(stage);
        });
    }
    // Add a random query string when loading the JSON files below. This avoids
    // persistent caching problems, where the browser (eg FF) uses the cached
    // without checking in with the server first.
    var now = new Date().getTime();
    PIXI.loader.defaultQueryString = "nocache=" + now;
    PIXI.loader.add(RES.MALE_MELEE).add(RES.FEMALE_MELEE).add(RES.NPC_TILESET).add(RES.MAPTILES).add(RES.ENEMIES).add(RES.WEAPONS).add(RES.GROUND_ITEMS).add(RES.UI).add(RES.DRAGON)
    //.add({name: "hit", url: "media/hit.wav"})
    .on("progress", progresscb).load(graphicsLoaded);
};

module.exports.resize = function () {
    gamestate.handleResize();
};

module.exports.getGamestate = function () {
    return gamestate;
};

},{"./controls":5,"./gamestate":8,"./levelscreen":17,"./progress":21,"./render":22,"./res":23,"./utils":30}],19:[function(require,module,exports){
"use strict";

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

var UI = require("./ui");
var RES = require("./res");
var Thing = require("./thing");
var Utils = require("./utils");

function NPC(img) {
    // Position of the hit box, relative to the sprite position
    this.hitbox = new Thing.Hitbox(0, 0, 5, 5);
    var texture = Utils.getFrame(RES.NPC_TILESET, img || "npc1_south_1");
    this.sprite = new PIXI.Container();
    this.npcSprite = new PIXI.Sprite(texture);
    this.npcSprite.anchor.set(0.5, 1);
    this.sprite.addChild(this.npcSprite);

    this.textSprite = new PIXI.Sprite(UI.renderText("?"));
    this.textSprite.scale.set(3 / 5.);
    this.textSprite.anchor.set(0.5, 1);
    this.textSprite.y = -this.npcSprite.height - 2;
    this.textSprite.visible = false;
    this.sprite.addChild(this.textSprite);

    this.visibleTimer = 0;
}

NPC.prototype.setDialog = function (lines) {
    this.textSprite.texture = UI.renderText(lines, { blackBG: true });
};

NPC.prototype.update = function (dt) {
    // Always face the player
    var dirx = Math.sign(this.level.player.sprite.x - this.sprite.x);
    this.npcSprite.scale.x = Math.abs(this.npcSprite.scale.x) * dirx;

    if (this.visibleTimer > 0) {
        this.visibleTimer -= dt;
        if (this.visibleTimer <= 0) {
            this.textSprite.visible = false;
        }
    }
};

NPC.prototype.handleHit = function (x, y, dmg) {
    this.setDialog(["HEY CAREFUL", "WITH THAT!"]);
    this.handlePlayerCollision();
};

NPC.prototype.handlePlayerCollision = function (player) {
    if (!this.textSprite.visible) {
        this.textSprite.visible = true;
    }
    this.visibleTimer = 1;
};

module.exports = NPC;

},{"./res":23,"./thing":27,"./ui":29,"./utils":30}],20:[function(require,module,exports){
"use strict";

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

var RES = require("./res");
var Utils = require("./utils");
var Item = require("./item");
var Thing = require("./thing");
var WeaponSlot = require("./weaponslot");
var Audio = require("./audio");

// What tint of colour to use when the player takes damage
var DAMAGE_TINT = 0xFF0000;
var NO_TINT = 0xFFFFFF;

function Player(controls) {
    this.controls = controls;
    this.sprite = null;
    this.velx = 0;
    this.vely = 0;
    this.accelx = 0;
    this.accely = 0;
    this.frame = 0;
    this.frames = null;
    this.lungeFrame = null;
    // Player health in half hearts. This should always be a multiple of two
    this.maxHealth = 8;
    this.health = this.maxHealth;
    this.maxSpeed = 40; // pixels/second
    // Inventory stuff
    this.numCoins = 0;
    this.numArrows = 0;
    this.armour = Item.Table.NONE;
    this.bow = Item.Table.NONE;
    this.sword = Item.Table.NONE;
    // Whether the user has free control over the player (set to false 
    // during a cutscene)
    //this.hasControl = true;
    this.dirx = 0;
    this.diry = 0;
    // Process of dying (showing animation)
    this.dying = false;
    // Actually dead
    this.dead = false;
    // The number of kills (stored by monster name). Also stores the 
    // image of the monster (for displaying stats later)
    //     {count: ZZZ, img: ZZZ}
    this.kills = {};

    // Define the hitbox
    this.hitbox = new Thing.Hitbox(0, -4, 6, 6);

    this.setCharFrames(RES.FEMALE_MELEE, "melee1");
    /* Setup a PIXI container to hold the player sprite, and any other 
     * equipment they're carrying. */
    this.sprite = new PIXI.Container();
    // Setup the player sprite (texture comes later)
    this.spriteChar = new PIXI.Sprite();
    this.spriteChar.anchor.set(0.5, 1);
    this.sprite.addChild(this.spriteChar);
    // Setup the sprite for when the player is treading water
    this.waterSprite = Utils.createSplashSprite();
    this.waterSprite.y = -1.5;
    this.sprite.addChild(this.waterSprite);

    // Minimum amount of time after taking damage, until the player can be
    // damaged again.
    this.damageCooldown = 1;
    // The timer used for tracking the cooldown
    this.damageTimer = 0;

    this.weaponSlot = null;

    // Knockback timer and speed
    this.knockedTimer = 0;
    this.knocked = 0;
    // Weapon slots are used to manage the weapon sprite. (ie attack and
    // running animations, etc) We add both slot sprites to the player sprite,
    // then use the 'visible' flag to control which is rendered.
    this.bowWeaponSlot = new WeaponSlot.Bow(this);
    this.swordWeaponSlot = new WeaponSlot.Sword(this);
    this.sprite.addChild(this.bowWeaponSlot.sprite);
    this.sprite.addChild(this.swordWeaponSlot.sprite);
    this.bowWeaponSlot.sprite.visible = false;
    this.swordWeaponSlot.sprite.visible = false;

    this.handleCollisionCallback = function (thing) {
        if (thing.handlePlayerCollision) {
            thing.handlePlayerCollision(this);
        }
    }.bind(this);
}

/* Have the player face the given direction */
Player.prototype.faceDirection = function (dirx) {
    this.sprite.scale.x = Math.abs(this.sprite.scale.x) * Math.sign(dirx);
};

Player.prototype.getFacing = function () {
    return Math.sign(this.sprite.scale.x);
};

Player.prototype.update = function (dt) {
    var dirx = 0;
    var diry = 0;

    if (this.dead) return;

    // Handle dying state animation
    if (this.dying) {
        this.frame += 2.5 * dt;
        if (this.frame > this.dyingFrames.length - 1) {
            this.frame = this.dyingFrames.length - 1;
            this.dead = true;
        }
        var frame = this.dyingFrames[this.frame | 0];
        this.spriteChar.texture = frame;
        return;
    }

    // Check if the player has just died
    if (this.health <= 0) {
        this.dying = true;
        this.frame = 0;
        this.weaponSlot = null;
        this.updatePlayerAppearance();
        this.spriteChar.tint = NO_TINT;
        // Bring the player corpse to the front (so it's rendered very 
        // clearly overtop any other junk in the scene)
        this.level.stage.removeChild(this.sprite);
        this.level.stage.addChild(this.sprite);
        return;
    }

    // Handle attacking
    if (this.controls.primary.pressed) this.startAttack();
    if (!this.controls.primary.released) this.stopAttack();

    if (this.controls.swap.pressed) {
        this.swapWeapons();
    }

    if (this.knockedTimer <= 0) {
        dirx = this.controls.getX();
        diry = this.controls.getY();
    } else {
        this.velx = this.knocked;
        this.knockedTimer -= dt;
    }

    if (dirx) {
        this.faceDirection(dirx);
        this.velx = dirx * this.maxSpeed;
    } else {
        this.velx *= 0.75;
    }

    if (diry) {
        this.vely = diry * this.maxSpeed;
    } else {
        this.vely *= 0.75;
    }

    if (dirx || diry) {
        this.frame += dt;
    } else {
        this.frame = 0;
    }

    var speed = Math.sqrt(this.velx * this.velx + this.vely * this.vely);
    if (speed > this.maxSpeed) {
        this.velx *= this.maxSpeed / speed;
        this.vely *= this.maxSpeed / speed;
    }

    // Handle left/right movement
    var w = this.spriteChar.texture.width * 0.75;
    if (this.velx) {
        var x = this.sprite.x + this.velx * dt;
        // Keep the player visible to the camera
        if (!this.level.checkSolidAt(x, this.sprite.y, w) && x - w / 2 >= this.level.camera.x && x + w / 2 <= this.level.camera.x + this.level.camera.width) {
            this.sprite.x = x;
        } else {
            this.velx = 0;
        }
    }
    // Handle up/down movement
    if (this.vely) {
        var y = this.sprite.y + this.vely * dt;
        if (!this.level.checkSolidAt(this.sprite.x, y, w)) {
            this.sprite.y = y;
        } else {
            this.vely = 0;
        }
    }

    // Update the equipped weapon
    if (this.weaponSlot && this.weaponSlot.update) {
        this.weaponSlot.update(dt);
    }

    // Make a splashy sound when we enter water
    var tile = this.level.bg.getTileAt(this.sprite.x, this.sprite.y);
    if (tile.water) {
        if (!this.waterSprite.visible) Audio.playSound(RES.SPLASH_SND);
        this.waterSprite.visible = true;
    } else {
        this.waterSprite.visible = false;
    }

    if (this.damageTimer > 0) {
        this.damageTimer -= dt;
        if (this.damageTimer <= 0 || this.damageCooldown - this.damageTimer > 0.1) {
            // Stop flashing red
            this.spriteChar.tint = NO_TINT;
        }
    }

    //if (controls.testKey && !controls.lastTestKey) this.health = 0;

    // Check for collisions with other things
    this.level.forEachThingHit(this.sprite.x, this.sprite.y, this.hitbox, this, this.handleCollisionCallback);

    // Update animation
    var frame = this.frames[(this.frame * 10 | 0) % this.frames.length];
    this.spriteChar.texture = frame;
};

Player.prototype.setCharFrames = function (res, name) {
    this.frames = Utils.getFrames(res, [name + "_south_1", name + "_south_2", name + "_south_3"]);
    this.lungeFrame = Utils.getFrame(res, name + "_lunge_1");
    this.dyingFrames = Utils.getFrames(res, ["melee1_dying_1", "melee1_dying_2", "melee1_dying_3"]);
};

Player.prototype.setArmour = function (item) {
    // Change the player appearance based on their armour
    this.armour = item;
    this.updatePlayerAppearance();
};

Player.prototype.updatePlayerAppearance = function () {
    // Update the player character sprite, based on the armour we're wearing
    var img = "melee1";
    if (this.armour === Item.Table.LEATHER_ARMOUR) img = "melee2";else if (this.armour == Item.Table.STEEL_ARMOUR) img = "melee3";
    this.setCharFrames(RES.FEMALE_MELEE, img);
    // Update the sword sprite
    // ...
    // Update the bow sprite
    // ...
    var b = this.weaponSlot === this.bowWeaponSlot;
    this.bowWeaponSlot.sprite.visible = b;

    var b = this.weaponSlot === this.swordWeaponSlot;
    this.swordWeaponSlot.sprite.visible = b;

    if (this.weaponSlot) this.weaponSlot.update(0);
};

Player.prototype.upgradeSword = function (item) {
    // Switch over to the sword if we don't have a weapon equipped
    if (!this.weaponSlot) {
        this.weaponSlot = this.swordWeaponSlot;
    }
    this.sword = item;
    this.updatePlayerAppearance();
};

Player.prototype.upgradeBow = function (item) {
    // Switch over to the bow if we don't have a weapon equipped
    if (!this.weaponSlot) {
        this.weaponSlot = this.bowWeaponSlot;
    }
    this.bow = item;
    this.updatePlayerAppearance();
};

Player.prototype.upgradeArmour = function (item) {
    this.setArmour(item);
    Audio.playSound(RES.POWERUP2_SND);
};

Player.prototype.healDamage = function (amt) {
    if (this.health < this.maxHealth) {
        this.health = Math.min(this.health + amt, this.maxHealth);
        Audio.playSound(RES.POWERUP4_SND, 1.25);
    }
};

Player.prototype.takeDamage = function (amt, src) {
    if (this.damageTimer <= 0) {
        // Adjust the damage parameters based on our armour
        var cooldown = this.damageCooldown;
        var knockedVel = 100;
        var knockedTimer = 0.1;

        if (this.armour === Item.Table.LEATHER_ARMOUR) {
            cooldown = this.damageCooldown * 1.25;
            knockedVel = 90;
            knockedTimer = 0.08;
            if (Utils.randint(1, 4) === 1) {
                if (amt > 1) amt--;
            }
        } else if (this.armour === Item.Table.STEEL_ARMOUR) {
            cooldown = this.damageCooldown * 1.5;
            knockedVel = 80;
            knockedTimer = 0.05;
            if (Utils.randint(1, 2) === 1) {
                amt--;
            }
        }

        Audio.playSound(RES.HIT_SND);

        // Take damage and have the player flash red for a moment
        this.health -= amt;
        this.damageTimer = this.damageCooldown;
        this.spriteChar.tint = DAMAGE_TINT;
        // Knock the player back a bit too
        this.knocked = knockedVel * Math.sign(this.sprite.x - src.sprite.x);
        this.knockedTimer = knockedTimer;
    }
};

Player.prototype.swapWeapons = function () {
    if (this.weaponSlot === this.swordWeaponSlot && this.bow !== Item.Table.NONE) {
        this.weaponSlot = this.bowWeaponSlot;
        this.updatePlayerAppearance();
    } else if (this.weaponSlot === this.bowWeaponSlot && this.sword !== Item.Table.NONE) {
        this.weaponSlot = this.swordWeaponSlot;
        this.updatePlayerAppearance();
    }
};

Player.prototype.startAttack = function () {
    if (this.weaponSlot) this.weaponSlot.startAttack();
};

Player.prototype.stopAttack = function () {
    if (this.weaponSlot) this.weaponSlot.stopAttack();
};

/* Called when a monster (thing) is killed by the player */
Player.prototype.handleMonsterKilled = function (monster) {
    if (this.kills[monster.name] === undefined) {
        this.kills[monster.name] = { count: 0, img: monster.frames[0] };
    }
    this.kills[monster.name].count++;
};

/* Called when the player walks over a takeable item (GroundItem). The item
 * is passed in here. (eg Item.Table.ZZZ) */
Player.prototype.handleTakeItem = function (item) {
    // Check for an armour upgrade
    if (item.isArmour() && item.isBetter(this.armour)) {
        this.upgradeArmour(item);
        return true;
    }
    // Check for a sword upgrade
    if (item.isSword() && item.isBetter(this.sword)) {
        this.upgradeSword(item);
        return true;
    }
    // Check for a bow upgrade
    if (item.isBow() && item.isBetter(this.bow)) {
        this.upgradeBow(item);
        return true;
    }
    // Consumable items
    switch (item) {
        case Item.Table.ARROW:
            this.numArrows += 5;
            break;

        case Item.Table.COIN:
            this.numCoins++;
            break;

        case Item.Table.SMALL_HEALTH:
            this.healDamage(2);
            break;

        case Item.Table.LARGE_HEALTH:
            this.healDamage(this.maxHealth);
            break;
    }
    Audio.playSound(RES.COIN_SND);
    return true;
};

module.exports = Player;

},{"./audio":2,"./item":15,"./res":23,"./thing":27,"./utils":30,"./weaponslot":31}],21:[function(require,module,exports){
'use strict';

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

function ProgressBar(width, height, text) {
    this.width = width;
    this.height = height;
    this.current = 0;
    //this.text = null;
    this.sprite = new PIXI.Container();
    this.barSprite = new PIXI.Sprite();
    this.textSprite = new PIXI.Text(text, { fontFamily: 'Courier New',
        fontSize: 20,
        fill: 0xffffff,
        fontWeight: 'bold',
        align: 'center' });
    this.textSprite.y = height + 5;
    //this.textSprite.scale.y = 0.5;
    this.sprite.addChild(this.barSprite);
    this.sprite.addChild(this.textSprite);
}

ProgressBar.prototype.setText = function (text) {
    this.textSprite.text = text;
};

ProgressBar.prototype.update = function (value) {
    this.current = value;
    var canvas = document.createElement("canvas");
    canvas.width = this.width;
    canvas.height = this.height;

    var ctx = canvas.getContext("2d");
    ctx.fillStyle = "#ddd";
    ctx.fillRect(0, 0, this.width * this.current, this.height);
    ctx.strokeStyle = "#f00";
    ctx.strokeRect(0, 0, this.width, this.height);

    this.barSprite.texture = PIXI.Texture.fromCanvas(canvas);
};

module.exports = ProgressBar;

},{}],22:[function(require,module,exports){
"use strict";

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

// The PIXI renderer
var renderer = null;
// The containing element
var container = null;
// The preferred aspect ratio for sizing the render view
var aspectRatio = 1;

module.exports = {};

/* Configures the renderer (via PIXI) and adds the view to the given HTML
 * element. The renderer width/height will conform to the given aspect 
 * ratio. */
module.exports.configure = function (div, aspect) {
    PIXI.settings.SCALE_MODE = PIXI.SCALE_MODES.NEAREST;
    // Disable the ticker sinc we don't use it (rendering happens as needed)
    PIXI.ticker.shared.autoStart = false;
    PIXI.ticker.shared.stop();

    var rect = div.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) {
        throw Error("Invalid size for renderer");
    }

    // Maintain the aspect ratio when sizing the render view
    var width = Math.round(rect.height * aspect);
    var height = rect.height;

    if (width > rect.width) {
        width = rect.width;
        height = Math.round(rect.height / aspect);
    }

    //renderer = new PIXI.CanvasRenderer({
    renderer = PIXI.autoDetectRenderer({
        width: width,
        height: height,
        //antialias: true,
        // Required to prevent flickering in Chrome on Android (others too?)
        preserveDrawingBuffer: true
        //clearBeforeRender: true
    });
    renderer.plugins.interaction.destroy();

    renderer.view.className = "canvas";

    div.innerHTML = "";
    div.appendChild(renderer.view);
    container = div;
    aspectRatio = aspect;
};

module.exports.getContainer = function () {
    return container;
};

module.exports.getRenderer = function () {
    return renderer;
};

/* Resize the renderer to fit the parent container */
module.exports.resize = function () {
    var rect = container.getBoundingClientRect();
    // Maintain the aspect ratio when resizing the render view
    var width = Math.round(rect.height * aspectRatio);
    var height = rect.height;

    if (width > rect.width) {
        width = rect.width;
        height = Math.round(rect.width / aspectRatio);
    }

    renderer.resize(width, height);
    //container.innerHTML = "";
    //container.appendChild(renderer.view);
};

},{}],23:[function(require,module,exports){
"use strict";

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

module.exports = {
    MALE_MELEE: "media/rogue-like-8x8/Male-Melee.json",
    FEMALE_MELEE: "media/rogue-like-8x8/Girl-Melee.json",
    NPC_TILESET: "media/rogue-like-8x8/NPC.json",
    MAPTILES: "media/rogue-like-8x8/Tileset.json",
    ENEMIES: "media/rogue-like-8x8/Enemies.json",
    WEAPONS: "media/rogue-like-8x8/Weapons.json",
    GROUND_ITEMS: "media/rogue-like-8x8/GroundItems.json",
    UI: "media/rogue-like-8x8/UI.json",
    DRAGON: "media/rogue-like-8x8/Dragon.json",

    GAME_MUSIC: "media/music/A Journey Awaits2-lowfi.ogg",
    ATTACK_SWORD_SND: "media/effects/attack_sword2.wav",
    HIT_SND: "media/effects/hit.wav",
    SNAKE_HURT_SND: "media/effects/snake_hurt.wav",
    DEAD_SND: "media/effects/dead.wav",
    SPLASH_SND: "media/effects/splash.wav",
    ARROW_DING_SND: "media/effects/arrow_ding.wav",
    GO_SND: "media/effects/go.wav",
    COIN_SND: "media/effects/coin.wav",
    GATE_SND: "media/effects/gate.wav",
    DROP_SND: "media/effects/drop.wav",
    POWERUP1_SND: "media/effects/powerup1.wav",
    POWERUP2_SND: "media/effects/powerup2.wav",
    POWERUP3_SND: "media/effects/powerup3.wav",
    POWERUP4_SND: "media/effects/powerup4.wav",
    CHEST_SND: "media/effects/chest_open.wav",

    TILE_WIDTH: 8,
    TILE_HEIGHT: 8,
    WALL_HEIGHT: 13,

    renderer: null
};

},{}],24:[function(require,module,exports){
"use strict";

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

function Scenery(frames) {
    if (!(frames instanceof Array)) frames = [frames];
    this.frames = frames;
    this.sprite = new PIXI.Sprite(frames[0]);
    this.sprite.anchor.set(0.5, 1);
    this.timer = 0;
    this.velx = 0;
    this.vely = 0;
    this.fps = 5;
    this.frame = 0;
}

Scenery.prototype.faceDirection = function (dir) {
    this.sprite.scale.x = Math.abs(this.sprite.scale.x) * Math.sign(dir);
};

Scenery.prototype.update = function (dt) {
    this.sprite.x += this.velx * dt;
    this.sprite.y += this.vely * dt;
    if (this.timer > 0) {
        this.timer -= dt;
        if (this.timer <= 0) {
            this.level.removeThing(this);
        }
    }
    if (this.frames.length > 1) {
        this.frame += this.fps * dt;
        var img = this.frames[(this.frame | 0) % this.frames.length];
        this.sprite.texture = img;
    }
};

module.exports = Scenery;

},{}],25:[function(require,module,exports){
"use strict";

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

var RES = require("./res");
var Utils = require("./utils");
var Thing = require("./thing");
var Item = require("./item");
var Audio = require("./audio");

var SKEL_WARRIOR_IDLE = 0;
// Slowly approaching the player
var SKEL_WARRIOR_START_APPROACH = 1;
var SKEL_WARRIOR_APPROACH = 2;
// Actually attacking the player
var SKEL_WARRIOR_ATTACKING = 3;
var SKEL_WARRIOR_POST_ATTACK = 4;
// Knocked back
var SKEL_WARRIOR_HURT = 5;
var SKEL_WARRIOR_DEAD = 6;

/* The goblin keeps their distance while the player is facing them, and 
 * quickly approaches to attack when the player's back is turned */
function SkelWarrior(state) {
    this.name = "Skeleton";
    this.idleFrame = Utils.getFrame(RES.ENEMIES, "skeleton_warrior_south_1");
    this.frames = Utils.getFrames(RES.ENEMIES, SkelWarrior.FRAMES);
    this.speed = 20;
    this.health = 3;
    this.frame = 0;
    this.facing = 1;
    this.dead = false;
    // When approaching the player, how far to keep distance
    this.approachDist = 30;
    this.timer = null;
    this.counter = 0;
    // The sprite container holding the monster and splash sprite
    this.sprite = new PIXI.Container(this.frames[0]);
    // The actual goblin sprite
    this.monsterSprite = new PIXI.Sprite();
    this.monsterSprite.anchor.set(0.5, 6.5 / 8);
    this.sprite.addChild(this.monsterSprite);
    // Make the splash/water sprite
    this.waterSprite = Utils.createSplashSprite();
    this.waterSprite.y = -0.5;
    this.sprite.addChild(this.waterSprite);
    this.knocked = 0;
    this.knockedTimer = 0;
    this.state = state || SKEL_WARRIOR_START_APPROACH;
    this.hitbox = new Thing.Hitbox(0, -1, 6, 8);
}

SkelWarrior.FRAMES = ["skeleton_warrior_south_2", "skeleton_warrior_south_3"];

SkelWarrior.prototype.getDropTable = function () {
    return [[Item.Table.LARGE_HEALTH, 5], [Item.Table.LEATHER_ARMOUR, 1], [Item.Table.SMALL_BOW, 1]];
};

SkelWarrior.prototype.update = function (dt) {
    switch (this.state) {
        case SKEL_WARRIOR_ATTACKING:
            this.updateAttacking(dt);
            break;

        case SKEL_WARRIOR_POST_ATTACK:
            this.timer -= dt;
            if (this.timer <= 0) {
                this.state = SKEL_WARRIOR_START_APPROACH;
            }
            break;

        case SKEL_WARRIOR_START_APPROACH:
            this.timer = null;
            this.state = SKEL_WARRIOR_APPROACH;
            break;

        case SKEL_WARRIOR_APPROACH:
            this.updateApproach(dt);
            break;

        case SKEL_WARRIOR_HURT:
            this.updateHurt(dt);
            break;

        case SKEL_WARRIOR_DEAD:
            this.level.removeThing(this);
            break;
    }
};

SkelWarrior.prototype.updateAttacking = function (dt) {
    // Pause before attacking
    if (this.timer > 0) {
        this.timer -= dt;
        return;
    }

    // Rush towards the player
    var player = this.level.player;
    var dx = 0,
        dy = 0;

    if (player.sprite.x > this.sprite.x) {
        dx = 2.5 * this.speed * dt;
        this.facing = 1;
    } else {
        dx = -2.5 * this.speed * dt;
        this.facing = -1;
    }
    this.sprite.scale.x = this.facing * Math.abs(this.sprite.scale.x);

    if (Math.abs(this.sprite.x - player.sprite.x) < 5) {
        // Hit the player
        // ...
        this.timer = 0.25;
        this.state = SKEL_WARRIOR_POST_ATTACK;
        return;
    }

    // Move up/down towards the player more slowly (and don't overshoot)
    var dist = player.sprite.y - this.sprite.y;
    if (Math.abs(dist) > 2) {
        dy = dt * this.speed * Math.sign(dist) / 2.0;
    }

    // Check if we can move left/right
    var tile = this.level.bg.getTileAt(this.sprite.x + dx, this.sprite.y);
    if (!tile.solid) {
        this.sprite.x += dx;
        this.waterSprite.visible = tile.water;
    }

    // Now check if it can move up/down. Doing this separately from the check
    // above means we can "slide" along walls and such.
    var tile2 = this.level.bg.getTileAt(this.sprite.x, this.sprite.y + dy);
    if (!tile2.solid) {
        // Go a bit faster if we're just moving up/down
        if (tile.solid) this.sprite.y += 3 * dy;else {
            this.sprite.y += dy;
            this.waterSprite.visible = tile2.water;
        }
    }
    this.frame += 4 * dt;
    this.monsterSprite.texture = this.frames[this.frame % this.frames.length | 0];
};

SkelWarrior.prototype.updateApproach = function (dt) {
    // Move towards the player, but try to keep a fixed distance away. 
    // Initially the target is set to the player's position, plus/minus
    // a fixed offset.
    var player = this.level.player;
    var targetx = 0;
    if (this.sprite.x < player.sprite.x) {
        targetx = player.sprite.x - this.approachDist;
        this.facing = 1;
    } else if (this.sprite.x > player.sprite.x) {
        targetx = player.sprite.x + this.approachDist;
        this.facing = -1;
    }
    this.sprite.scale.x = this.facing * Math.abs(this.sprite.scale.x);

    // Rush the player for an attack, if they're facing away from us
    // (note the goblin always faces the player)
    /*if (player.facing*this.facing > 0) {
      this.state = SKEL_WARRIOR_ATTACKING;
      return;
      }*/

    if (this.timer === null) {
        var dist = Math.abs(this.sprite.x - player.sprite.x);
        if (dist >= this.approachDist * 0.9 && dist <= this.approachDist * 1.1) {
            this.timer = 1.5;
        }
    } else {
        // Attack the player after a while
        this.timer -= dt;
        if (this.timer <= 0) {
            this.state = SKEL_WARRIOR_ATTACKING;
            this.timer = 0.4;
            return;
        }
    }

    // Add a bit of variation to the target position, so the goblin kind of
    // waivers back and forth making it a bit harder to hit.
    var dx = 0;
    var dy = 0;
    targetx += 20 * Math.cos(this.frame / 6);
    if (Math.abs(this.sprite.x - targetx) > 2) {
        dx = dt * Math.sign(targetx - this.sprite.x);
    }

    // Move more slowly when going backwards
    var speed = this.speed;
    if (this.facing * dx < 0) speed = this.speed / 1.5;

    // Move up/down towards the player as well. Raising sine to a higher power
    // makes the vertical oscillations more "tight". (ie less smooth)
    var targety = player.sprite.y + 35 * Math.pow(Math.sin(this.frame / 4), 2) - 20;
    var dist = targety - this.sprite.y;
    if (Math.abs(dist) > 1) {
        dy = dt * Math.sign(dist);
    }
    dx *= speed;
    dy *= speed;
    // Check if we can move horizontally (checked separately from vertical 
    // movement to prevent us from getting stuck)
    var tile = this.level.bg.getTileAt(this.sprite.x + dx, this.sprite.y);
    if (!tile.solid) {
        this.sprite.x += dx;
        this.waterSprite.visible = tile.water;
    }
    // Handle vertical movement
    var tile = this.level.bg.getTileAt(this.sprite.x, this.sprite.y + dy);
    if (!tile.solid) {
        this.sprite.y += dy;
        this.waterSprite.visible = tile.water;
    }
    this.frame += 4 * dt;
    this.monsterSprite.texture = this.frames[this.frame % this.frames.length | 0];
};

SkelWarrior.prototype.updateHurt = function (dt) {
    // Slide backwards from the hit
    if (this.knockedTimer > 0) {
        var dx = this.knocked * dt;
        var tile = this.level.bg.getTileAt(this.sprite.x + dx, this.sprite.y);
        if (!tile.solid) {
            this.sprite.x += dx;
        }
        this.knockedTimer -= dt;
    } else {
        this.state = SKEL_WARRIOR_APPROACH;
    }
};

SkelWarrior.prototype.handleHit = function (srcx, srcy, dmg) {
    var player = this.level.player;
    if (this.state === SKEL_WARRIOR_DEAD) return false;
    this.health -= 1;
    if (this.health <= 0) {
        Audio.playSound(RES.DEAD_SND);
        this.state = SKEL_WARRIOR_DEAD;
        // Drop a reward
        this.level.handleTreasureDrop(this.getDropTable(), this.sprite.x, this.sprite.y);
        player.handleMonsterKilled(this);
        this.dead = true;
    } else {
        Audio.playSound(RES.SNAKE_HURT_SND);
        this.knocked = Math.sign(this.sprite.x - srcx) * 60;
        this.knockedTimer = 0.1;
        this.state = SKEL_WARRIOR_HURT;
    }

    // Add some random dust, but only if we're not currently in water
    var tile = this.level.bg.getTileAt(this.sprite.x, this.sprite.y);
    if (!tile.water) {
        this.level.createBloodSpatter(this.sprite.x, this.sprite.y - 1, ["dust1", "dust2", "dust3", "dust4"]);
    }
    return true;
};

SkelWarrior.prototype.handlePlayerCollision = function (player) {
    player.takeDamage(2, this);
};

module.exports = SkelWarrior;

},{"./audio":2,"./item":15,"./res":23,"./thing":27,"./utils":30}],26:[function(require,module,exports){
"use strict";

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

var RES = require("./res");
var Utils = require("./utils");
var Thing = require("./thing");
var Item = require("./item");
var Audio = require("./audio");

/*********/
/* Snake */
/*********/

var SNAKE_IDLE = 0;
var SNAKE_ATTACKING = 1;
var SNAKE_HURT = 2;
var SNAKE_DEAD = 3;

function Snake(state) {
    this.name = "Snake";
    this.frames = Utils.getFrames(RES.ENEMIES, Snake.FRAMES);
    this.speed = 16;
    this.health = 3;
    this.frame = 0;
    this.facing = 1;
    this.dead = false;
    this.travel = 0;
    // The sprite container holding the snake and splash sprite
    this.sprite = new PIXI.Container();
    // The actual snake sprite
    this.snakeSprite = new PIXI.Sprite(this.frames[0]);
    this.snakeSprite.anchor.set(0.5, 6.5 / 8);
    this.sprite.addChild(this.snakeSprite);
    // Make the splash/water sprite
    this.waterSprite = Utils.createSplashSprite();
    this.waterSprite.y = -1.25;
    this.sprite.addChild(this.waterSprite);
    this.knocked = 0;
    this.knockedTimer = 0;
    this.state = state || SNAKE_ATTACKING;
    this.hitbox = new Thing.Hitbox(0, -1, 6, 6);
}

Snake.FRAMES = ["snake_south_1", "snake_south_2"];

Snake.prototype.getDropTable = function () {
    return [[Item.Table.COIN, 2], [Item.Table.ARROW, 1], [Item.Table.SMALL_HEALTH, 1]];
};

Snake.prototype.update = function (dt) {
    if (this.state === SNAKE_IDLE) this.updateIdle(dt);else if (this.state === SNAKE_ATTACKING) this.updateAttacking(dt);else if (this.state === SNAKE_HURT) this.updateHurt(dt);else if (this.state === SNAKE_DEAD) {
        this.level.removeThing(this);
    }
};

Snake.prototype.updateIdle = function (dt) {
    var player = this.level.player;
    this.frame += 2 * dt;
    this.snakeSprite.texture = this.frames[this.frame % this.frames.length | 0];

    // Turn left/right searching for the player
    this.facing = Math.sign(Math.cos(this.frame / 10));
    this.sprite.scale.x = this.facing * Math.abs(this.sprite.scale.x);

    // Start attacking the player when they're close enough, and when
    // the snake is facing them.
    if (Math.abs(player.sprite.x - this.sprite.x) < this.level.camera.width / 3 && this.facing * (player.sprite.x - this.sprite.x) > 0) {
        this.state = SNAKE_ATTACKING;
    }
};

Snake.prototype.updateAttacking = function (dt) {
    var dx = 0,
        dy = 0;
    var player = this.level.player;

    // Move towards the player for a bit. Note the snake moves in "steps"
    // so it will occasionally overshot the player before moving back again.
    if (this.travel > 0) {
        dx = this.speed * dt * this.facing;
        this.sprite.scale.x = this.facing * Math.abs(this.sprite.scale.x);
        this.travel -= Math.abs(dx);
    } else {
        if (player.sprite.x < this.sprite.x) this.facing = -1;else this.facing = 1;
        this.travel = Utils.randint(16, 20);
    }

    // Move up/down towards the player more slowly (and don't overshoot)
    var dist = player.sprite.y - this.sprite.y;
    if (Math.abs(dist) > 5) {
        dy = dt * Math.sign(dist) * this.speed / 2;
    }

    // Check if the snake can move left/right
    var tile = this.level.bg.getTileAt(this.sprite.x + dx, this.sprite.y);
    if (!tile.solid) {
        this.sprite.x += dx;
        this.waterSprite.visible = tile.water;
    }

    // Now check if it can move up/down. Doing this separately from the check
    // above means we can "slide" along walls and such.
    var tile2 = this.level.bg.getTileAt(this.sprite.x, this.sprite.y + dy);
    if (!tile2.solid) {
        // Go a bit faster if we're just moving up/down
        if (tile.solid) this.sprite.y += 1 * dy;else {
            this.sprite.y += dy;
            this.waterSprite.visible = tile2.water;
        }
    }
    this.frame += 4 * dt;
    this.snakeSprite.texture = this.frames[this.frame % this.frames.length | 0];
};

Snake.prototype.updateHurt = function (dt) {
    // The snake keeps its eyes closed while hurt
    this.snakeSprite.texture = this.frames[1];
    // Slide backwards from the hit
    if (this.knockedTimer > 0) {
        var dx = this.knocked * dt;
        var tile = this.level.bg.getTileAt(this.sprite.x + dx, this.sprite.y);
        if (!tile.solid) {
            this.sprite.x += dx;
        }
        this.knockedTimer -= dt;
    } else {
        // Resume/start attacking
        this.state = SNAKE_ATTACKING;
        this.travel = 0;
    }
};

Snake.prototype.handleHit = function (srcx, srcy, dmg) {
    var player = this.level.player;
    if (this.state === SNAKE_DEAD) return false;
    this.health -= 1;
    if (this.health <= 0) {
        Audio.playSound(RES.DEAD_SND);
        this.state = SNAKE_DEAD;
        // Drop a reward
        this.level.handleTreasureDrop(this.getDropTable(), this.sprite.x, this.sprite.y);
        player.handleMonsterKilled(this);
        this.dead = true;
    } else {
        Audio.playSound(RES.SNAKE_HURT_SND);
        this.knocked = Math.sign(this.sprite.x - srcx) * 60;
        this.knockedTimer = 0.1;
        this.state = SNAKE_HURT;
    }

    // Add some random blood, but only if we're not currently in water
    // (looks better this way)
    var tile = this.level.bg.getTileAt(this.sprite.x, this.sprite.y);
    if (!tile.water) {
        this.level.createBloodSpatter(this.sprite.x, this.sprite.y - 1);
    }
    return true;
};

Snake.prototype.handlePlayerCollision = function (player) {
    player.takeDamage(1, this);
};

/* Other snake-like things */

/*******/
/* Rat */
/*******/

function Rat() {
    Snake.call(this);
    this.name = "Rat";
    this.frames = Utils.getFrames(RES.ENEMIES, Rat.FRAMES);
    this.health = 1;
    this.speed = 20;
    this.frame = 0;
    this.facing = 1;
    this.travel = 20;
    this.knocked = 0;
    this.knockedTimer = 0;
    this.state = SNAKE_ATTACKING;
    this.snakeSprite.texture = this.frames[0];
    this.waterSprite.y = -0.9;
}

Rat.FRAMES = ["rat_south_1", "rat_south_2"];

Rat.prototype = Object.create(Snake.prototype);

/************/
/* Scorpion */
/************/

function Scorpion() {
    Snake.call(this);
    this.name = "Scorpion";
    this.frames = Utils.getFrames(RES.ENEMIES, Scorpion.FRAMES);
    this.health = 4;
    this.speed = 10;
    this.frame = 0;
    this.facing = 1;
    this.travel = 20;
    this.knocked = 0;
    this.knockedTimer = 0;
    this.state = SNAKE_ATTACKING;
    this.snakeSprite.texture = this.frames[0];
    this.waterSprite.y = -0.85;
}

Scorpion.FRAMES = ["scorpion_south_1", "scorpion_south_2"];

Scorpion.prototype = Object.create(Snake.prototype);

module.exports = {
    Snake: Snake,
    Rat: Rat,
    Scorpion: Scorpion
};

},{"./audio":2,"./item":15,"./res":23,"./thing":27,"./utils":30}],27:[function(require,module,exports){
"use strict";

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

var Utils = require("./utils");

/* Template code for defining a 'thing' in a level. Generally things have 
 * sprites associated with them, and can be interacted with by the player.
 * Note there's no need to subclass because this code doesn't contain any
 * useful base functionality. Just copy+paste and change what's needed. */
function Thing() {
  // Position of the hit box, relative to the sprite position
  this.hitbox = new Thing.Hitbox(0, 0, 5, 5);
  var texture = Utils.getFrame(RES.GROUND_ITEMS, "coin");
  this.sprite = new PIXI.Sprite(texture);
  this.sprite.anchor.set(0, 0);
}

Thing.prototype.update = function (dt) {};

Thing.prototype.handleHit = function (x, y, dmg) {};

Thing.prototype.handlePlayerCollision = function (player) {};

/**********/
/* Hitbox */
/**********/

// A hitbox that defines an area of a thing to test collisions against. Note
// the (x, y) point is relative to the thing's sprite position, and (w, h)
// defines a rectangle that is centered on that position.
Thing.Hitbox = function (x, y, w, h) {
  this.x = x;
  this.y = y;
  this.w = w;
  this.h = h;
};

module.exports = Thing;

},{"./utils":30}],28:[function(require,module,exports){
"use strict";

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

var RES = require("./res");
var Utils = require("./utils");
var Render = require("./render");
var UI = require("./ui");
var GameControls = require("./controls");
var LevelGenerator = require("./genlevel");
var Player = require("./player");
var Item = require("./item");
var Scenery = require("./scenery");
var SnakeLike = require("./snake");
var Goblin = require("./goblin");
var SkelWarrior = require("./skel_warrior");
var Ghost = require("./ghost");
var LevelScreen = require("./levelscreen");

var Snake = SnakeLike.Snake;
var Rat = SnakeLike.Rat;
var Scorpion = SnakeLike.Scorpion;

/***************/
/* TitleScreen */
/***************/

function TitleScreen() {
    // Playing through the intro sequence (looping)
    this.PLAYING_INTRO = 1;
    // Player wants to start a new game
    this.NEW_GAME = 2;

    // The (native) height of the title screen before scaling
    this.screenHeight = 80;
    this.screenWidth = Math.round(LevelScreen.getAspectRatio() * this.screenHeight);
    // Calculate the native-to-screen scaling so that the title screen fits
    // the available vertical space.
    var scale = Render.getRenderer().height / this.screenHeight;

    // Now figure out how wide the screen is (to fill the space)
    //var screenWidth = Render.getRenderer().width/scale;

    // The PIXI container for rendering the scene
    this.stage = new PIXI.Container();
    this.stage.scale.set(scale);
    this.state = this.PLAYING_INTRO;

    this.bg = new PIXI.Sprite(Utils.getFrame(RES.UI, "brown3"));
    this.bg.anchor.set(0, 0);
    this.bg.scale.set(this.screenWidth / this.bg.texture.width + 1, this.screenHeight / this.bg.texture.height + 1);
    this.stage.addChild(this.bg);
    this.delay = 0;

    var txt = new PIXI.Sprite(Utils.getFrame(RES.UI, "title-text"));
    txt.anchor.set(0.5, 0.5);
    txt.tint = 0xFF0000;
    //txt.x = getRenderer().width/2;
    txt.x = this.screenWidth / 2;
    txt.y = 15;
    this.stage.addChild(txt);

    txt = new PIXI.Sprite(Utils.getFrame(RES.UI, "demo-text"));
    txt.anchor.set(0.5, 0.5);
    txt.tint = 0xFF0000;
    //txt.x = getRenderer().width/2;
    txt.x = this.screenWidth / 2;
    txt.y = 25;
    this.stage.addChild(txt);

    txt = new PIXI.Sprite(UI.renderText("PRESS SPACE TO PLAY"));
    txt.scale.set(0.75);
    txt.anchor.set(0.5, 0.5);
    txt.tint = 0xFF0000;
    txt.x = this.screenWidth / 2;
    txt.y = 35;
    this.stage.addChild(txt);

    txt = new PIXI.Sprite(UI.renderText("PROGRAMMING BY PETER ROGERS."));
    txt.scale.set(0.5);
    txt.anchor.set(0.5, 0.5);
    txt.tint = 0xFF0000;
    txt.x = this.screenWidth / 2;
    txt.y = 70;
    this.stage.addChild(txt);

    txt = new PIXI.Sprite(UI.renderText("MUSIC IS (C) PIERRA BONDOERFFER. ARTWORK IS PUBLIC DOMAIN."));
    txt.scale.set(0.5);
    txt.anchor.set(0.5, 0.5);
    txt.tint = 0xFF0000;
    txt.x = this.screenWidth / 2;
    txt.y = 75;
    this.stage.addChild(txt);

    this.sequence = new Utils.Sequence({
        stage: this.stage,
        level: null,
        player: null,
        screenWidth: this.screenWidth,
        screenHeight: this.screenHeight
    }, "start", function (dt) {
        this.level = LevelGenerator.generateEmpty(2, Math.round(this.screenWidth / RES.TILE_WIDTH) + 4, "smooth_floor_m");
        this.level.stage.x = -RES.TILE_WIDTH * 2;
        this.level.stage.y = 40;
        //this.level.camera.x = RES.TILE_WIDTH*2;
        this.level.camera.width = this.level.getWidth();
        this.stage.addChild(this.level.stage);
        // Note the screen position within the level (so we can know when
        // objects are offscreen)
        this.screenLeft = -this.level.stage.x;
        this.screenRight = this.screenLeft + this.screenWidth;
        // Create a dummy player to drive around
        this.controls = new GameControls.ManualControls();
        this.player = new Player(this.controls);
        this.player.sprite.x = 2;
        this.player.sprite.y = 20;
        this.level.addThing(this.player);

        this.monsterChoices = [Rat.FRAMES, Snake.FRAMES, Scorpion.FRAMES, SkelWarrior.FRAMES, Goblin.FRAMES, Ghost.FRAMES];
        this.monsterChoice = 0;

        this.monster = new Scenery(Utils.getFrames(RES.ENEMIES, this.monsterChoices[0]));
        this.monster.sprite.y = this.player.sprite.y;
        this.level.addThing(this.monster);

        return this.NEXT;
    }, function (dt) {
        // Have the player run right offscreen
        this.controls.dirx = 1;
        this.player.update(dt);
        if (this.player.sprite.x > this.screenRight + 4) {
            this.monster.sprite.x = this.screenRight + 16;
            return this.NEXT;
        }
    }, "loop", function (dt) {
        // Have the player run the other way chased by a monster
        this.controls.dirx = -1;
        this.player.update(dt);
        this.monster.velx = -20;
        this.monster.update(dt);
        this.monster.faceDirection(-1);
        if (this.player.sprite.x < this.screenLeft - 4) {
            this.player.upgradeSword(Item.Table.SMALL_SWORD);
            return this.NEXT;
        }
    }, function (dt) {
        // Now the player chases the monster with a sword
        this.controls.dirx = 1;
        this.player.update(dt);
        this.monster.velx = 20;
        this.monster.update(dt);
        this.monster.faceDirection(1);
        if (this.player.sprite.x > this.screenRight + 4) {
            // New monster chases the player
            this.monsterChoice++;
            var choice = this.monsterChoices[this.monsterChoice % this.monsterChoices.length];
            this.monster.frames = Utils.getFrames(RES.ENEMIES, choice);
            return "loop";
        }
    });
}

TitleScreen.prototype.update = function (dt) {
    if (this.delay > 0) {
        this.delay -= dt;
        return;
    }

    this.sequence.update(dt);

    if (GameControls.getControls().space.released) {
        this.state = this.NEW_GAME;
    }
};

TitleScreen.prototype.render = function () {
    Render.getRenderer().render(this.stage);
};

TitleScreen.prototype.handleResize = function () {
    if (this.stage) {
        var scale = Math.min(Render.getRenderer().width / this.screenWidth, Render.getRenderer().height / this.screenHeight);
        this.stage.scale.set(scale);
    }
};

module.exports = TitleScreen;

},{"./controls":5,"./genlevel":10,"./ghost":11,"./goblin":12,"./item":15,"./levelscreen":17,"./player":20,"./render":22,"./res":23,"./scenery":24,"./skel_warrior":25,"./snake":26,"./ui":29,"./utils":30}],29:[function(require,module,exports){
"use strict";

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

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

var RES = require("./res");
var Utils = require("./utils");
var Render = require("./render");
var Item = require("./item");
var Audio = require("./audio");

function renderText(lines, options) {
    if (!(lines instanceof Array)) lines = [lines];

    var maxWidth = 0;
    var cnt = new PIXI.Container();
    var y = 1;
    for (var row = 0; row < lines.length; row++) {
        var x = 1;
        var msg = lines[row];
        var height = 0;
        for (var n = 0; n < msg.length; n++) {
            var sprite = new PIXI.Sprite(Utils.getFrame(RES.UI, msg[n]));
            sprite.anchor.set(0, 0);
            sprite.x = x;
            sprite.y = y;
            // Make spaces a bit more narrow (looks better)
            if (msg[n] === " ") x += (sprite.width + 1) / 2;else x += sprite.width + 1;
            cnt.addChild(sprite);
            height = Math.max(height, sprite.height);
        }
        maxWidth = Math.max(maxWidth, x);
        y += height + 1;
    }

    if (options && options.blackBG) {
        var bg = new PIXI.Sprite(Utils.getFrame(RES.UI, "black"));
        bg.scale.set(maxWidth / bg.width, y / bg.height);
        cnt.addChildAt(bg, 0);
        // TODO - why doesn't this work for render textures?
        //renderer.backgroundColor = 0x000000;
    }

    var renderTexture = PIXI.RenderTexture.create(maxWidth, y);
    Render.getRenderer().render(cnt, renderTexture);
    return renderTexture;
}

/************/
/* HealthUI */
/************/

function HealthUI() {
    this.player = null;
    this.sprite = new PIXI.Container();
    this.hearts = [];
    this.fullHeart = Utils.getFrame(RES.UI, "full_bigheart");
    this.halfHeart = Utils.getFrame(RES.UI, "half_bigheart");
    this.emptyHeart = Utils.getFrame(RES.UI, "empty_bigheart");

    for (var n = 0; n < 3; n++) {
        this.addHeart();
    }
}

// Adds a heart to the UI
HealthUI.prototype.addHeart = function () {
    var heart = new PIXI.Sprite(this.fullHeart);
    this.hearts.push(heart);
    this.sprite.addChild(heart);

    var x = -this.hearts.length * (this.fullHeart.width + 1);
    var _iteratorNormalCompletion = true;
    var _didIteratorError = false;
    var _iteratorError = undefined;

    try {
        for (var _iterator = this.hearts[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
            var _heart = _step.value;

            _heart.x = x;
            x += this.fullHeart.width + 1;
        }
    } catch (err) {
        _didIteratorError = true;
        _iteratorError = err;
    } finally {
        try {
            if (!_iteratorNormalCompletion && _iterator.return) {
                _iterator.return();
            }
        } finally {
            if (_didIteratorError) {
                throw _iteratorError;
            }
        }
    }
};

// Removes the last heart from this UI
HealthUI.prototype.removeHeart = function () {
    if (this.hearts.length > 0) {
        this.sprite.removeChild(this.hearts.pop());
    }
};

HealthUI.prototype.update = function (dt) {
    if (!this.player) return;

    // Add hearts to match the player's max health
    while (this.hearts.length < Math.floor(this.player.maxHealth / 2)) {
        this.addHeart();
    }
    // Remove hearts to match the player's max health
    while (this.hearts.length > Math.floor(this.player.maxHealth / 2)) {
        this.removeHeart();
    }
    // Synchronize the hearts to reflect the player's health
    for (var n = 0; n < this.hearts.length; n++) {
        var img = null;
        if (n < Math.floor(this.player.health / 2)) {
            img = this.fullHeart;
        } else if (n < Math.floor((this.player.health + 1) / 2)) {
            img = this.halfHeart;
        } else {
            img = this.emptyHeart;
        }
        this.hearts[n].texture = img;
    }
};

/**************/
/* ItemSlotUI */
/**************/

// A single inventory slot, showing the picture of an item (from the tile
// sheet GROUND_ITEMS) and optionally a quantity value below.
function ItemSlotUI(item, args) {
    this.sprite = new PIXI.Container();
    this.baseItem = item;
    this.item = item;
    this.count = 0;
    this.itemSprite = new PIXI.Sprite(Utils.getFrame(RES.GROUND_ITEMS, item.image));
    this.itemSprite.anchor.set(0.5, 0);
    this.itemSprite.x = 0.5;
    this.itemSprite.y = 0;
    this.slotSprite = new PIXI.Sprite(Utils.getFrame(RES.UI, "small_slot"));
    this.slotSprite.anchor.set(0.5, 0);
    this.sprite.addChild(this.slotSprite);
    this.sprite.addChild(this.itemSprite);

    if (args && args.x) this.itemSprite.x += args.x;
    if (args && args.y) this.itemSprite.y += args.y;

    if (args && args.showCount) {
        var img = renderText("--");
        this.textSprite = new PIXI.Sprite(img);
        this.textSprite.anchor.set(0.5, 0.5);
        this.textSprite.x = 0;
        this.textSprite.y = 12;
        this.textSprite.scale.set(0.75);
        this.sprite.addChild(this.textSprite);
    }
}

ItemSlotUI.prototype.setCount = function (count) {
    if (this.textSprite && this.count !== count) {
        this.count = count;
        if (count === 0) count = "--";else if (count < 9) count = "0" + count;
        this.textSprite.texture = renderText("" + count);
    }
};

ItemSlotUI.prototype.setItem = function (item) {
    // If no item is specified, use the item passed to the constructor instead
    if (item === Item.Table.NONE) item = this.baseItem;
    if (this.item !== item) {
        this.item = item;
        this.itemSprite.texture = Utils.getFrame(RES.GROUND_ITEMS, item.image);
    }
};

/***************/
/* InventoryUI */
/***************/

// Show the player inventory as a set of item slots (ItemSlotUI instances)
function InventoryUI() {
    this.player = null;
    this.sprite = new PIXI.Container();
    this.armourSlot = new ItemSlotUI(Item.Table.NO_ARMOUR);
    this.swordSlot = new ItemSlotUI(Item.Table.NO_SWORD);
    this.bowSlot = new ItemSlotUI(Item.Table.NO_BOW, { x: -0.5 });
    this.arrowSlot = new ItemSlotUI(Item.Table.ARROW, { showCount: true });
    this.coinSlot = new ItemSlotUI(Item.Table.COIN, {
        showCount: true,
        x: -0.5,
        y: 0.5
    });

    this.slots = [this.armourSlot, this.swordSlot, this.bowSlot, this.arrowSlot, this.coinSlot];
    var x = 0;
    var _iteratorNormalCompletion2 = true;
    var _didIteratorError2 = false;
    var _iteratorError2 = undefined;

    try {
        for (var _iterator2 = this.slots[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
            var slot = _step2.value;

            this.sprite.addChild(slot.sprite);
            slot.sprite.x = x;
            x += slot.slotSprite.texture.width + 1;
        }
    } catch (err) {
        _didIteratorError2 = true;
        _iteratorError2 = err;
    } finally {
        try {
            if (!_iteratorNormalCompletion2 && _iterator2.return) {
                _iterator2.return();
            }
        } finally {
            if (_didIteratorError2) {
                throw _iteratorError2;
            }
        }
    }
}

InventoryUI.prototype.update = function (dt) {
    if (this.player) {
        // TODO - use an event/listener system instead of doing this
        this.armourSlot.setItem(this.player.armour);
        this.swordSlot.setItem(this.player.sword);
        this.bowSlot.setItem(this.player.bow);
        this.arrowSlot.setCount(this.player.numArrows);
        this.coinSlot.setCount(this.player.numCoins);
    }
};

/**********/
/* Button */
/**********/

var Button = function () {
    function Button(stateList) {
        var _this = this;

        _classCallCheck(this, Button);

        this.onclick = null;
        this.sprite = new PIXI.Sprite();
        this.sprite.anchor.set(0, 0);
        this.states = {};
        this.state = null;
        stateList.forEach(function (arg) {
            var name = arg[0];
            var img = arg[1];
            _this.states[name] = Utils.getFrame(RES.UI, img);
            if (!_this.state) _this.state = name;
        });
        this.setState(this.state);
        this.sprite.interactive = true;
        this.sprite.click = function () {
            if (_this.onclick) _this.onclick();
        };
    }

    _createClass(Button, [{
        key: "setState",
        value: function setState(state) {
            if (state && this.states.hasOwnProperty(state)) {
                this.sprite.texture = this.states[state];
                this.state = state;
            }
        }
    }]);

    return Button;
}();

/**********/
/* GameUI */
/**********/

var GameUI = function () {
    function GameUI() {
        var _this2 = this;

        _classCallCheck(this, GameUI);

        this.container = new PIXI.Container();
        this.healthUI = new HealthUI(this);
        this.inventoryUI = new InventoryUI(this);
        this.bg = new PIXI.Sprite(Utils.getFrame(RES.UI, "black"));
        this.audioButton = new Button([["on", "audio-on"], ["off", "audio-off"]]);
        this.audioButton.onclick = function () {
            if (_this2.audioButton.state === "on") {
                _this2.audioButton.setState("off");
                Audio.setEnabled(false);
            } else {
                _this2.audioButton.setState("on");
                Audio.setEnabled(true);
            }
        };

        this.container.addChild(this.bg);
        this.container.addChild(this.healthUI.sprite);
        this.container.addChild(this.inventoryUI.sprite);
        this.container.addChild(this.audioButton.sprite);
    }

    _createClass(GameUI, [{
        key: "setPlayer",
        value: function setPlayer(player) {
            this.healthUI.player = player;
            this.inventoryUI.player = player;
        }
    }, {
        key: "update",
        value: function update(dt) {
            this.healthUI.update(dt);
            this.inventoryUI.update(dt);
        }
    }, {
        key: "doLayout",
        value: function doLayout(x, y, width, height) {
            this.container.x = x;
            this.container.y = y;
            this.inventoryUI.sprite.x = 5.5;
            this.inventoryUI.sprite.y = 1;
            this.audioButton.sprite.x = width - this.audioButton.sprite.width - 1;
            this.audioButton.sprite.y = 1;
            this.healthUI.sprite.x = 86;
            this.healthUI.sprite.y = 2;
            this.bg.scale.set(width / this.bg.texture.width, height / this.bg.texture.height);
        }
    }]);

    return GameUI;
}();

module.exports = {
    renderText: renderText,
    HealthUI: HealthUI,
    InventoryUI: InventoryUI,
    ItemSlotUI: ItemSlotUI,
    GameUI: GameUI
};

},{"./audio":2,"./item":15,"./render":22,"./res":23,"./utils":30}],30:[function(require,module,exports){
"use strict";

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

var RES = require("./res");

// Returns a random number integer between a & b (inclusive)
function randint(a, b) {
    return a + (b - a + 1) * Math.random() | 0;
}

// Returns a random number selected uniformly over the interval [a, b)
function randUniform(a, b) {
    return a + (b - a + 1) * Math.random();
}

// Returns a random element selected uniformly from the given list
function randomChoice(lst) {
    var n = Math.random() * lst.length | 0;
    return lst[n];
}

// Returns a matrix (ie n[row][col]) of the given value. Also the number of
// rows and columns (rows, cols) are available as attributes.
function createGrid(rows, cols, value) {
    var grid = [];
    grid.rows = rows;
    grid.cols = cols;
    for (var row = 0; row < rows; row++) {
        grid[row] = [];
        for (var col = 0; col < cols; col++) {
            grid[row][col] = value;
        }
    }
    return grid;
}

// Returns a sprite used for monsters/player treading water
function createSplashSprite() {
    var waterSprite = new PIXI.Sprite();
    waterSprite.anchor.set(0.5, 0.5);
    waterSprite.visible = false;
    waterSprite.texture = getFrame(RES.MAPTILES, "treading_water");
    return waterSprite;
}

// Helper function for returning a texture set given the resource string
function getTextures(res) {
    if (!res) throw Error("must specify a resource");
    return PIXI.loader.resources[res].textures;
}

function getFrame(res, name) {
    return getTextures(res)[name];
}

function getFrames(res, names) {
    var frames = [];
    for (var n = 0; n < names.length; n++) {
        var frame = getTextures(res)[names[n]];
        if (!frame) console.log("ERROR: missing frame " + names[n]);
        frames.push(frame);
    }
    return frames;
}

// Updates a dictionary with the contents of another dictionary
function updateDict(dict, other) {
    for (var key in other) {
        dict[key] = other[key];
    }
}

/************/
/* Sequence */
/************/

function Sequence() {
    var args = arguments[0];
    for (var key in args) {
        this[key] = args[key];
    }
    this.done = false;
    this.numSteps = arguments.length - 1;
    this.labels = {};
    for (var n = 1; n < arguments.length; n++) {
        // The sequence contains functions to call, and embedded strings to
        // use as labels. (for looping, branching, etc)
        if (arguments[n].constructor === String) {
            this.labels[arguments[n]] = n - 1;
        } else {
            // Note functions are assigned to this object, so that calling
            // them this way gives us access to 'this' inside.
            var name = "func_" + (n - 1);
            this[name] = arguments[n];
        }
    }
    // The current state. This advances incrementally by default, and 
    // occasionally jumping randomly to another state.
    this.state = 0;
    // Delay before advancing the state
    this.delay = 0;
    this.NEXT = true;
}

Sequence.prototype.update = function (dt) {
    if (this.done) return;
    if (this.delay > 0) {
        this.delay -= dt;
        return;
    }
    // Check if the current state is a function (or a label)
    var fname = "func_" + this.state;
    if (this[fname]) {
        var ret = this[fname](dt);
        if (ret === this.NEXT) {
            // Advance to the next state
            this.state++;
        } else if (ret) {
            // Jump to another state
            this.state = this.labels[ret];
        }
    } else {
        // Skip over the label
        this.state++;
    }
    if (this.state >= this.numSteps) {
        this.done = true;
    }
};

module.exports = {
    randint: randint,
    randUniform: randUniform,
    randomChoice: randomChoice,
    Sequence: Sequence,
    createGrid: createGrid,
    createSplashSprite: createSplashSprite,

    getFrame: getFrame,
    getFrames: getFrames,
    getTextures: getTextures
};

},{"./res":23}],31:[function(require,module,exports){
"use strict";

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

var RES = require("./res");
var Utils = require("./utils");
var Thing = require("./thing");
var Audio = require("./audio");

var ARROW_FLIGHT = 0;
var ARROW_FALLING = 1;
var ARROW_DISAPPEAR = 2;

/*********/
/* Sword */
/*********/

function SwordWeaponSlot(player) {
    // Setup the weapon sprite (texture will come later)
    this.sprite = new PIXI.Sprite();
    //this.weaponSprite.anchor.set(6.5/8, 4/8.); // bow
    this.sprite.anchor.set(4. / 8, 3.9 / 8); // sword
    //this.weaponSprite.anchor.set(5.5/8, 4./8); // staff
    // Sprite position (relative to the player) and rotation
    this.sprite.x = 2.5;
    this.sprite.y = -4;
    this.sprite.rotation = -Math.PI / 3;
    this.attackCooldown = 0;
    this.weaponReach = 3.25;
    this.player = player;
    this.hitbox = new Thing.Hitbox(0, -4, 10, 6);
    // Which weapon texture is currently displayed
    this.textureName = null;
    this.setTexture("sword2");

    this.handleHitCallback = function (hit) {
        if (hit.handleHit) {
            hit.handleHit(this.player.sprite.x, this.player.sprite.y, 1);
        }
    }.bind(this);
}

SwordWeaponSlot.prototype.update = function (dt) {
    if (this.attackCooldown > 0) {
        this.attackCooldown -= dt;
        if (this.attackCooldown <= 0) {
            this.sprite.x = 2.5;
            this.sprite.rotation = -Math.PI / 3;
        }
    }

    /* Staff placement */
    /*this.weaponSprite.x = 3.4*SCALE;
      this.weaponSprite.y = -4*SCALE;
      this.weaponSprite.rotation = 0;*/
};

// Set which sword to display. The sprite is taken from the WEAPONS sheet
SwordWeaponSlot.prototype.setTexture = function (name) {
    if (this.textureName !== name) {
        this.sprite.texture = Utils.getFrame(RES.WEAPONS, name);
        this.textureName = name;
    }
};

SwordWeaponSlot.prototype.startAttack = function () {
    if (this.attackCooldown > 0) return;

    Audio.playSound(RES.ATTACK_SWORD_SND);
    this.sprite.rotation = 0;
    this.sprite.x = 3.5;
    this.attackCooldown = 0.15;

    this.player.level.forEachThingHit(this.player.sprite.x + this.player.getFacing() * this.weaponReach, this.player.sprite.y, this.hitbox, this.player, this.handleHitCallback);
};

SwordWeaponSlot.prototype.stopAttack = function () {};

/*******/
/* Bow */
/*******/

function BowWeaponSlot(player) {
    // Setup the weapon sprite (texture will come later)
    this.sprite = new PIXI.Sprite();
    this.sprite.anchor.set(6.5 / 8, 4 / 8.); // bow
    //this.weaponSprite.anchor.set(5.5/8, 4./8); // staff
    // Sprite position (relative to the player) and rotation
    this.player = player;
    this.attackCooldown = 0;
    this.textureName = null;
    this.setTexture("bow1");
}

BowWeaponSlot.prototype.update = function (dt) {
    if (this.attackCooldown <= 0) {
        /* Have the bow rock back and forth as the player moves. */
        this.sprite.rotation = Math.PI / 5 + Math.PI / 40 * Math.cos(10 * this.player.frame);
        this.sprite.x = 3.0;
        this.sprite.y = -2.5;
    } else {
        this.sprite.rotation = 0;
        this.sprite.x = 3;
        this.sprite.y = -3.25;
        this.attackCooldown -= dt;
    }
    /* Staff placement */
    /*this.weaponSprite.x = 3.4*SCALE;
      this.weaponSprite.y = -4*SCALE;
      this.weaponSprite.rotation = 0;*/
};

// Set which bow to display. The sprite is taken from the WEAPONS sheet
BowWeaponSlot.prototype.setTexture = function (name) {
    if (this.textureName !== name) {
        this.sprite.texture = Utils.getFrame(RES.WEAPONS, name);
        this.textureName = name;
    }
};

BowWeaponSlot.prototype.startAttack = function () {
    // Make sure we have an arrow to fire
    if (this.player.numArrows <= 0) return;
    if (this.attackCooldown > 0) return;
    Audio.playSound(RES.ATTACK_SWORD_SND);
    this.attackCooldown = 0.2;

    this.player.numArrows--;

    var arrow = new Arrow(this.player, this.player.sprite.x, this.player.sprite.y + this.sprite.y, this.player.getFacing() * 100, 0, Math.abs(this.sprite.y));
    //level.things.push(arrow);
    //level.stage.addChild(arrow.sprite);
    this.player.level.addThing(arrow);
};

BowWeaponSlot.prototype.stopAttack = function () {};

function Arrow(owner, x, y, velx, vely, height) {
    this.owner = owner;
    this.sprite = new PIXI.Sprite(Utils.getFrame(RES.WEAPONS, "arrow"));
    this.sprite.anchor.set(0.5, 0.5);
    this.sprite.scale.x = Math.sign(velx);
    this.sprite.scale.y = 1;
    this.sprite.x = x;
    this.sprite.y = y;
    this.velx = velx;
    this.vely = vely;
    this.height = height;
    this.state = ARROW_FLIGHT;
    this.timer = 0;
    this.hitbox = new Thing.Hitbox(0, 0, 5, 5);
}

Arrow.prototype.update = function (dt) {
    var level = this.owner.level;
    if (this.state === ARROW_FLIGHT) {
        this.sprite.x += this.velx * dt;
        this.sprite.y += this.vely * dt;
        // The arrow disappears when it's no longer visible
        if (this.sprite.x < level.camera.x || this.sprite.x > level.camera.x + level.camera.width) {
            level.removeThing(this);
        }
        // Check if the arrow hits a wall
        var tile = level.bg.getTileAt(this.sprite.x + Math.sign(this.velx) * 4, this.sprite.y + this.height);
        if (tile.solid) {
            this.velx *= -0.25;
            this.vely = 0;
            this.state = ARROW_FALLING;
            Audio.playSound(RES.ARROW_DING_SND, 0.4);
            return;
        }
        // Now check if we've hit an enemy
        var other = level.checkHit(this.sprite.x, this.sprite.y, this.hitbox, this.owner);
        if (other && other.handleHit) {
            var ret = other.handleHit(this.sprite.x, this.sprite.y, 1);
            if (ret === true) {
                level.removeThing(this);
            }
        }
    } else if (this.state === ARROW_FALLING) {
        this.vely -= 700 * dt;
        this.height += this.vely * dt;
        this.sprite.x += this.velx * dt;
        this.sprite.y -= this.vely * dt;
        if (this.height <= 0) {
            this.timer = 1;
            this.state = ARROW_DISAPPEAR;
        }
    } else {
        this.timer -= dt;
        if (this.timer <= 0) level.removeThing(this);
    }
};

module.exports = {
    Bow: BowWeaponSlot,
    Sword: SwordWeaponSlot
};

},{"./audio":2,"./res":23,"./thing":27,"./utils":30}]},{},[18])(18)
});