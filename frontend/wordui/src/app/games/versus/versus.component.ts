import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { PlayerState, VersusGame } from 'domain/game';
import { DialogModule } from 'primeng/dialog';
import { AuthService } from 'service/auth.service';
import { GameChangedEvent, VersusService } from 'service/game.service';

@Component({
  selector: 'app-versus',
  standalone: true,
  imports: [
    CommonModule,
    DialogModule,
  ],
  templateUrl: './versus.component.html',
  styleUrl: './versus.component.css'
})
export class VersusComponent implements OnInit, OnDestroy {

  visible: boolean = false;
  game: VersusGame = new VersusGame();

  myId = this.authService.DiscordId;

  subscriptions: any[] = [];

  constructor(
    private versusService: VersusService,
    private authService: AuthService,
    private route: ActivatedRoute,
  ) {}

  ngOnInit() {
    this.visible = true;

    this.subscriptions.push(this.versusService.onJoinRoom().subscribe((game: VersusGame) => {
      this.game = game;
      this.versusService.connectToServer(game.game_id);
    }));

    this.subscriptions.push(this.versusService.onDataChanged().subscribe({
      next: (args) => {
        switch (args.event) {
          case GameChangedEvent.EnterSuccess:
            // this.game = args.data;
            break;
          case GameChangedEvent.StatusSuccess:
            this.game = args.data;
            break;
          default:
            break;
        }
      }
    }));

    this.connectoToGame();

  }

  ngOnDestroy() {
    this.subscriptions.forEach(subscription => subscription.unsubscribe());
    this.versusService.disconnect();
  }

  getGameIdFromRoute(): string {
    const url = this.route.snapshot.params['game_id'];
    return url ? url : '';
  }

  connectoToGame(): void {
    const code = this.getGameIdFromRoute().substring(0, 5);
    this.versusService.enterRoom(code);
  }

  toggleReady(): void {
    this.versusService.toggleReady();
  }

  onlinePlayers(): PlayerState[] {
    return this.game.players.filter(p => p.online);
  }

}
