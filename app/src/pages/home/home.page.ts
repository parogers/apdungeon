
import { MenuController } from '@ionic/angular';
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
    private game: any;

    constructor(private menuCtrl: MenuController) {
        
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

        this.game = new Game(div);
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
