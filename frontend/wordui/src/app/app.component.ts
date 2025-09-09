import { Component, OnInit, ViewChild } from '@angular/core';
import { AuthChangedEvent, AuthService } from './service/auth.service';
import { User } from './domain/user';
import { RouterOutlet } from '@angular/router';
import { MenuModule } from 'primeng/menu';
import { ButtonModule } from 'primeng/button';
import { CommonModule } from '@angular/common';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { VersusService } from 'service/game.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    MenuModule,
    ButtonModule,
    ToastModule,
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit {
  
  userData: User = new User();
  
  menuItems = [
    {
      label: 'Options',
      items: [
          {
              label: 'Refresh',
              icon: 'pi pi-refresh'
          },
          {
              label: 'Export',
              icon: 'pi pi-upload'
          }
      ]
    }
  ];

  @ViewChild('menu') menu: any;

  constructor(
    private authService: AuthService,
    private versusService: VersusService,
    private messageService: MessageService,
  ) {}
  
  ngOnInit(): void {
    this.authService.onDataChanged().subscribe((AuthChangedResult) => {
      if (AuthChangedResult.event === AuthChangedEvent.UserDataFetched) {
        this.userData = new User().from_json(AuthChangedResult.data);
      } else if (AuthChangedResult.event === AuthChangedEvent.UserDataError) {
        this.messageService.add({ severity: 'error', summary: 'Errore', detail: 'Errore nel recupero dei dati utente', life: 5000 });
      } else if (AuthChangedResult.event === AuthChangedEvent.LoggedOut) {
        this.userData = new User();
      } else if (AuthChangedResult.event === AuthChangedEvent.LoggedOutError) {
      }
    });

    this.authService.fetchUserData();
  }

  requestLogin() {
    this.authService.login();
  }

  logout() {
    this.authService.logout();
  }
}
