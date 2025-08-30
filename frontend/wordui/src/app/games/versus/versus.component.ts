import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { User } from 'domain/user';
import { WordleComponent } from 'games/wordle/wordle.component';
import { DialogModule } from 'primeng/dialog';

@Component({
  selector: 'app-versus',
  standalone: true,
  imports: [
    CommonModule,
    WordleComponent,
    DialogModule,
  ],
  templateUrl: './versus.component.html',
  styleUrl: './versus.component.css'
})
export class VersusComponent implements OnInit, OnDestroy {

  visible: boolean = false;
  players: User[] = [
    new User().from_json({ id: 1, discord_id: '217966624886620160', discord_username: 'gigikiller', discord_avatar: '78168c031e6c8500f5e19a0459086bb7' }),
    new User().from_json({ id: 2, discord_id: '348424836680384512', discord_username: '.servitore', discord_avatar: '030b101412fbdc6e4ceacd105c0e1577' }),
  ];

  constructor() {}

  ngOnInit() {
    this.visible = true;
  }

  ngOnDestroy() {
    
  }

}
