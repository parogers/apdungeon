import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { PlayPageComponent } from './pages/play-page/play-page.component';

const routes: Routes = [
    {
        path: 'play',
        component: PlayPageComponent,
    },
    {
        path: '',
        component: PlayPageComponent,
    },
];

@NgModule({
    imports: [RouterModule.forRoot(routes)],
    exports: [RouterModule]
})
export class AppRoutingModule { }
