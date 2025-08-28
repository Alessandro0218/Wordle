import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { GameChangedEvent, GameChangedResult, VersusService } from 'service/game.service';
import { GameAction, VersusSocket } from 'service/websocket.service';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-servers-list',
  standalone: true,
  imports: [
    CommonModule,
    DialogModule,
    ButtonModule,
    
  ],
  templateUrl: './servers-list.component.html',
  styleUrl: './servers-list.component.css'
})
export class ServersListComponent implements OnInit, OnDestroy {

  servers: any = [];
  visible: boolean = false;

  constructor(
    private versusService: VersusService
  ) {}

  ngOnInit() {
    this.versusService.connectList();
    this.versusService.onDataChanged().subscribe({
      next: (args: GameChangedResult) => {
        switch (args.event) {
          case GameChangedEvent.ListSuccess:
            this.servers = args.data;
            break;
          default:
            break;
        }
      }
    });
  }

  ngOnDestroy() {
    
  }

  showDialog() {
    this.visible = true;
  }

}
