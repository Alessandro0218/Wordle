import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { GameChangedEvent, GameChangedResult, VersusService } from 'service/game.service';
import { GameAction, VersusSocket } from 'service/websocket.service';

@Component({
  selector: 'app-servers-list',
  standalone: true,
  imports: [
    CommonModule,
  ],
  templateUrl: './servers-list.component.html',
  styleUrl: './servers-list.component.css'
})
export class ServersListComponent implements OnInit, OnDestroy {

  servers: any = [];

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

}
