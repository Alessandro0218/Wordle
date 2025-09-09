import { Component, OnInit, ViewChild } from '@angular/core';
import { AuthChangedEvent, AuthService } from './service/auth.service';
import { User } from './domain/user';
import { RouterOutlet } from '@angular/router';
import { MenuModule } from 'primeng/menu';
import { ButtonModule } from 'primeng/button';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    MenuModule,
    ButtonModule,
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

  constructor(private authService: AuthService) {}
  
  ngOnInit(): void {
    this.authService.onDataChanged().subscribe((AuthChangedResult) => {
      if (AuthChangedResult.event === AuthChangedEvent.UserDataFetched) {
        this.userData = new User().from_json(AuthChangedResult.data);
      } else if (AuthChangedResult.event === AuthChangedEvent.UserDataError) {
        console.error('Error fetching user data:', AuthChangedResult.data);
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
