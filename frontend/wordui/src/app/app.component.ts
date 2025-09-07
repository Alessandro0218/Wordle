import { Component, OnInit } from '@angular/core';
import { AuthChangedEvent, AuthService } from './service/auth.service';
import { User } from './domain/user';
import { RouterOutlet } from '@angular/router';


@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet
],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit {
  
  userData: User = new User();
  
  constructor(private authService: AuthService) {}
  
  ngOnInit(): void {
    this.authService.onDataChanged().subscribe((AuthChangedResult) => {
      if (AuthChangedResult.event === AuthChangedEvent.UserDataFetched) {
        this.userData = new User().from_json(AuthChangedResult.data);
      } else if (AuthChangedResult.event === AuthChangedEvent.UserDataError) {
        console.error('Error fetching user data:', AuthChangedResult.data);
      }
    });

    this.authService.fetchUserData();
  }
  
  requestLogin() {
    this.authService.login();
  }
}
