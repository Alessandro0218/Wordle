import { Component } from '@angular/core';
import { WordleComponent } from 'games/wordle/wordle.component';

@Component({
  selector: 'app-versus',
  standalone: true,
  imports: [
    WordleComponent
  ],
  templateUrl: './versus.component.html',
  styleUrl: './versus.component.css'
})
export class VersusComponent {

}
