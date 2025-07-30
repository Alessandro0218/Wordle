import { Routes } from '@angular/router';

export const routes: Routes = [
    { path: 'wordle', loadComponent: () => import('./games/wordle/wordle.component').then(m => m.WordleComponent) },
    { path: '', loadComponent: () => import('./games/wordle/wordle.component').then(m => m.WordleComponent), pathMatch: 'full' },
];
