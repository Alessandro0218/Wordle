import { Routes } from '@angular/router';

export const routes: Routes = [
    { path: 'wordle', loadComponent: () => import('./games/wordle/wordle.component').then(m => m.WordleComponent) },
    { path: 'servers-list', loadComponent: () => import('./servers-list/servers-list.component').then(m => m.ServersListComponent) },
    { path: 'versus', loadComponent: () => import('./games/versus/versus.component').then(m => m.VersusComponent) },
    { path: '', loadComponent: () => import('./menu/menu.component').then(m => m.MenuComponent), pathMatch: 'full' },
];
