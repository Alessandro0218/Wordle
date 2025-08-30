import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from 'service/auth.service';

enum Mode {
  VERSUS = 'servers-list',
  WORDLE = 'wordle'
}

@Component({
  selector: 'app-menu',
  standalone: true,
  imports: [],
  templateUrl: './menu.component.html',
  styleUrl: './menu.component.css'
})
export class MenuComponent implements OnInit {
  
  Mode = Mode;

  constructor(
    protected authService: AuthService,
    private router: Router
  ) {}

  ngOnInit() {
    
  }

  onSelectionMode(mode: string): void {
    switch (mode) {
      case Mode.VERSUS:
        this.router.navigate([mode]);
        break;
      case Mode.WORDLE:
        this.router.navigate([mode]);
        break;
    }
  }



}
