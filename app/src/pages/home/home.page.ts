import { ViewChild, Component } from '@angular/core';
import { Game } from '../../game/main';

declare var PIXI: any;

@Component({
    selector: 'page-home',
    templateUrl: 'home.page.html',
    styleUrls: ['home.page.scss'],
})
export class HomePage
{
    @ViewChild('playarea') playArea;

    constructor() {
        
    }

    closeCreditsCallback()
    {
        /*let div = document.getElementById("credits");
        div.style.display = "none";
        resize();*/
    }

    ionViewWillEnter()
    {
        console.log(Game);

        let div = this.playArea.nativeElement;
        let width = window.innerWidth-5;
        let height = window.innerHeight-5;
        div.style.width = width + "px";
        div.style.height = height + "px";

        Game.start(div);

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
        Game.resize();
    }
}
