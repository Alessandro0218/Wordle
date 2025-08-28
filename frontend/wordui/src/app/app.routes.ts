import { Routes } from '@angular/router';

export const routes: Routes = [
    { path: 'wordle', loadComponent: () => import('./games/wordle/wordle.component').then(m => m.WordleComponent) },
    { path: 'versus', loadComponent: () => import('./servers-list/servers-list.component').then(m => m.ServersListComponent) },
    { path: '', loadComponent: () => import('./menu/menu.component').then(m => m.MenuComponent), pathMatch: 'full' },
];
