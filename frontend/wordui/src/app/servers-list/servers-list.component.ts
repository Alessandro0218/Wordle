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
  ],
  templateUrl: './servers-list.component.html',
  styleUrl: './servers-list.component.css'
})
export class ServersListComponent implements OnInit, OnDestroy {

  servers: any = [];
  visible: boolean = false;

  formGroup: FormGroup = new FormGroup({
    name: new FormControl("GIGI server", [Validators.required]),
    maxPlayers: new FormControl(2, [Validators.required]),
  });

  subscriptions: Subscription[] = [];

  constructor(
    private versusService: VersusService
  ) {}

  ngOnInit() {
    this.versusService.connectList();
    this.subscriptions.push(this.versusService.onDataChanged().subscribe({
      next: (args: GameChangedResult) => {
        switch (args.event) {
          case GameChangedEvent.ListSuccess:
            this.servers = args.data;
            break;
          case GameChangedEvent.StartSuccess:
            console.log(args.data);
            break;
          default:
            break;
        }
      }
    }));
  }

  ngOnDestroy() {
    this.subscriptions.forEach(subscription => subscription.unsubscribe());
  }

  showDialog() {
    this.visible = true;
  }

  onSubmitCreate() {
    if (this.formGroup.valid) {
      const { name, maxPlayers } = this.formGroup.value;
      this.versusService.createRoom(name, maxPlayers);
      this.visible = false;
    }
  }

  connectToServer(game_id: string) {
    this.versusService.connectToServer(game_id);
  }

}
