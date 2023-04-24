
import { Component, ViewChild } from '@angular/core';

import { Game } from '../../game/main';

declare var PIXI: any;

@Component({
    selector: 'app-play-page',
    templateUrl: './play-page.component.html',
    styleUrls: ['./play-page.component.scss']
})
export class PlayPageComponent {
    @ViewChild('playarea', { static: true })
    playArea: any;

    game: Game;

    constructor() {}

    ngOnInit() {
        const div = this.playArea.nativeElement;
        this.game = new Game(div);
        this.game.start();

        window.addEventListener("resize", () => this.resizeCallback());
        setTimeout(() => this.resizeCallback(), 500);
    }

    /* Resize the play area to fit the current window size */
    resizeCallback()
    {
        const width = window.innerWidth;
        const height = window.innerHeight;
        const div = this.playArea.nativeElement;

        div.style.width = width + "px";
        div.style.height = height + "px";
        this.game.resize();
    }
}
