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

import { MenuController } from '@ionic/angular';
import { NgZone, ViewChild, Component } from '@angular/core';
import { Game } from '../../game/main';

declare var PIXI: any;

@Component({
    selector: 'page-home',
    templateUrl: 'home.page.html',
    styleUrls: ['home.page.scss'],
})
export class HomePage
{
    @ViewChild('playarea', { static: true }) playArea;
    private game: any;
    private wrappedRequestAnimationFrame: any;

    constructor(
        private menuCtrl: MenuController,
        private ngZone: NgZone,
    ) {
        // Create a wrapper around requestAnimationFrame that prevents the
        // angular digest cycle from being triggered unnecessary
        this.wrappedRequestAnimationFrame = (func) => {
            return this.ngZone.runOutsideAngular(() => {
                return requestAnimationFrame(func);
            });
        };
    }

    closeCreditsCallback()
    {
        /*let div = document.getElementById("credits");
        div.style.display = "none";
        resize();*/
    }

    ionViewWillEnter()
    {
        let div = this.playArea.nativeElement;
        let width = window.innerWidth-5;
        let height = window.innerHeight-5;
        div.style.width = width + "px";
        div.style.height = height + "px";

        this.game = new Game(div, this.wrappedRequestAnimationFrame);
        this.game.start();

        window.addEventListener("resize", () => this.resizeCallback());
        setTimeout(() => this.resizeCallback(), 500);
    }

    resizeCallback()
    {
        let width = window.innerWidth;
        let height = window.innerHeight;

        /*let credits = document.getElementById("credits");
        let rect = credits.getBoundingClientRect();
        height -= (rect.bottom-rect.top);*/

        let div = this.playArea.nativeElement;
        div.style.width = width + "px";
        div.style.height = height + "px";
        this.game.resize();
    }

    handleMenu() {
        this.menuCtrl.open('main');
    }

    handleClose() {
        this.menuCtrl.close();
    }
}
