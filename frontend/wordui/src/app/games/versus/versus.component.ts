import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { PlayerState, VersusGame, VersusState } from 'domain/game';
import { DialogModule } from 'primeng/dialog';
import { AuthChangedEvent, AuthService } from 'service/auth.service';
import { GameChangedEvent, VersusService } from 'service/game.service';
import { TooltipModule } from "primeng/tooltip";

@Component({
  selector: 'app-versus',
  standalone: true,
  imports: [
    CommonModule,
    DialogModule,
    TooltipModule
],
  templateUrl: './versus.component.html',
  styleUrl: './versus.component.css'
})
export class VersusComponent implements OnInit, OnDestroy {

  visible: boolean = true;
  game: VersusGame = new VersusGame();

  myId = this.authService.DiscordId;

  subscriptions: any[] = [];

  VersusState = VersusState;

  constructor(
    private versusService: VersusService,
    private authService: AuthService,
    private route: ActivatedRoute,
  ) {}
  
  isPlayerReady(): boolean {
    return this.game.players.find(p => p.Player.discord_id === this.myId)?.Ready || false;
  }

  ngOnInit() {
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

    this.authService.onDataChanged().subscribe({
      next: (args) => {
        switch (args.event) {
          case AuthChangedEvent.UserDataFetched:
            this.myId = this.authService.DiscordId;
            break;
          default:
            break;
        }
      }
    });

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

  startGame(): void {
    this.versusService.startGame();
  }

  canStartGame(): boolean {
    if (this.myId !== this.game.owner?.discord_id) {
      return false;
    }
    return this.game.players.length === this.game.max_players && this.game.players.filter(p => p.Player.discord_id !== this.game.owner?.discord_id).every(p => p.Ready && p.Online);
  }

}
