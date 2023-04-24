
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
        const width = window.innerWidth-5;
        const height = window.innerHeight-5;
        div.style.width = width + "px";
        div.style.height = height + "px";

        this.game = new Game(div);
        this.game.start();

        window.addEventListener("resize", () => this.resizeCallback());
        setTimeout(() => this.resizeCallback(), 500);
    }

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
