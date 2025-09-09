import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { GameChangedEvent, GameChangedResult, VersusService } from 'service/game.service';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { InputNumberModule } from 'primeng/inputnumber';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { TooltipModule } from 'primeng/tooltip';
import { Subscription } from 'rxjs';
import { RippleModule } from 'primeng/ripple';
import { Router } from '@angular/router';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';

@Component({
  selector: 'app-servers-list',
  standalone: true,
  imports: [
    CommonModule,
    DialogModule,
    ButtonModule,
    InputNumberModule,
    InputTextModule,
    ReactiveFormsModule,
    TooltipModule,
    RippleModule,
    ToastModule,
  ],
  templateUrl: './servers-list.component.html',
  styleUrl: './servers-list.component.css'
})
export class ServersListComponent implements OnInit, OnDestroy {

  servers: any = [];
  createDialogVisibility: boolean = false;
  enterDialogVisibility: boolean = false;

  createRoom: FormGroup = new FormGroup({
    name: new FormControl("GIGI server", [Validators.required]),
    maxPlayers: new FormControl(2, [Validators.required]),
  });

  enterRoom: FormGroup = new FormGroup({
    code: new FormControl("", [Validators.required, Validators.minLength(5), Validators.maxLength(5)]),
  });

  subscriptions: Subscription[] = [];

  constructor(
    private versusService: VersusService,
    private router: Router,
    private messageService: MessageService,
  ) {}

  currentGameStatus(state: number): string {
    switch(state) {
      case 0:
        return "In attesa di giocatori";
      case 1:
        return "In corso";
      case 2:
        return "Terminato";
      default:
        return "Stato sconosciuto";
    }
  }

  ngOnInit() {
    this.versusService.connectList();
    this.subscriptions.push(this.versusService.onDataChanged().subscribe({
      next: (args: GameChangedResult) => {
        switch (args.event) {
          case GameChangedEvent.ListSuccess:
            this.servers = args.data;
            break;
          case GameChangedEvent.StartSuccess:
            /* console.log(args.data); */
            break;
          case GameChangedEvent.EnterSuccess:
            this.router.navigate(['/versus', args.data.game_id]);
            break;
          default:
            break;
        }
      }
    }));
  }

  ngOnDestroy() {
    this.subscriptions.forEach(subscription => subscription.unsubscribe());
    this.versusService.disconnect();
  }

  showCreateDialog() {
    this.createDialogVisibility = true;
  }

  showEnterDialog() {
    this.enterDialogVisibility = true;
  }

  onSubmitCreate() {
    if (this.createRoom.valid) {
      const { name, maxPlayers } = this.createRoom.value;
      this.versusService.createRoom(name, maxPlayers);
      this.createDialogVisibility = false;
    }
  }

  onSubmitEnter() {
    if (this.enterRoom.valid) {
      const { code } = this.enterRoom.value;
      this.versusService.enterRoom(code);
      this.enterDialogVisibility = false;
    }
  }

  connectToServer(game_id: string) {
    let code = game_id.substring(0, 5);
    this.versusService.enterRoom(code);
  }
}
