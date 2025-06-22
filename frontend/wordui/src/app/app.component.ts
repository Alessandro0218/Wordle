import { AfterViewInit, Component, Host, HostListener, OnInit } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { GameChangedEvent, GameService } from './service/game.service';
import { Game, Guess, WordStatus } from './domain/game';
import { CommonModule } from '@angular/common';
import { AuthChangedEvent, AuthChangedResult, AuthService } from './service/auth.service';
import { User } from './domain/user';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    CommonModule,
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit {
  allwedChars: string[] = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.toLowerCase().split('');

  MAX_LENGTH: number = 5;
  MAX_GUESSES: number = 6;

  correctLetters: string[] = [];
  presentLetters: string[] = [];
  absentLetters: string[] = [];

  word: string = '';

  game: Game = new Game();

  userData: User = new User();

  shakeAnimation = false;

  constructor(
    private gameService: GameService,
    private authService: AuthService,
  ) {}

  get currentIndex() {
    return this.game.CurrentGuess;
  }

  get guesses(): Guess[] {
    return this.game.Guesses;
  }
  set guesses(value: string[]) {
    this.game.Guesses = value.map(word => {
      const status = Array(this.MAX_LENGTH).fill(0);
      return new Guess(word.toUpperCase(), status);
    });
  }

  @HostListener('window:keydown', ['$event'])
  handleKeydown(event: KeyboardEvent) {
    if (['Backspace', 'Enter'].includes(event.key)) {
      event.preventDefault();
    }
    this.onKeydown(event);
  }

  @HostListener('animationend', ['$event'])
  handleAnimationEnd(event: AnimationEvent) {
    const target = event.target as HTMLElement;
    if (target.classList.contains('flip')) {
      target.classList.remove('flip');
    }
  }

  ngOnInit() {
    const gameId = localStorage.getItem('game_id');
    if (gameId) {
      this.game.GameId = gameId;
      this.gameService.fetchStatus(this.game.GameId);
    } else {
      console.log('No game ID found in localStorage, starting a new game.');
    }

    this.gameService.onDataChanged().subscribe({
      next: (result) => {
        if (result.event === GameChangedEvent.StartSuccess) {
          const data = result.data as Game;
          console.log('Game started successfully:', result.data);
          this.game.fromJson(data);
          if (this.game.GameId) localStorage.setItem('game_id', this.game.GameId);
        
        } else if (result.event === GameChangedEvent.GuessSuccess) {
          console.log('Guess submitted successfully:', result.data);
          const data = result.data as Game;
          this.game.fromJson(data);
          this.word = '';
          
        } else if (result.event === GameChangedEvent.StatusSuccess) {
          const data = result.data as Game;
          console.log('Game status updated:', data);
          this.game.fromJson(data);

        } else if (result.event === GameChangedEvent.GameNotFound) {
          console.warn('Game not found, starting a new game.');
          this.startGame();
        } else if (result.event === GameChangedEvent.WordNotValid) {
          console.error('Submitted word is not valid:', result.data);
          this.shakeAnimation = true;
          setTimeout(() => {
            this.shakeAnimation = false;
          }, 500);
        } else if (result.event === GameChangedEvent.StartError) {
          console.error('Error starting game:', result.data);
        }
        else if (result.event === GameChangedEvent.GuessError) {
          console.error('Error submitting guess:', result.data);
        }
      },
      error: (error) => {
        console.error('Error in game service:', error);
      }
    });

    this.authService.onDataChanged().subscribe((AuthChangedResult) => {
      if (AuthChangedResult.event === AuthChangedEvent.UserDataFetched) {
        this.userData = new User().fromJson(AuthChangedResult.data);
      } else if (AuthChangedResult.event === AuthChangedEvent.UserDataError) {
        console.error('Error fetching user data:', AuthChangedResult.data);
      }
    });

    this.authService.fetchUserData();
  }

  emulateKeydown(key: string) {
    const event = new KeyboardEvent('keydown', { key: key });
    this.onKeydown(event);
  }

  onKeydown(event: KeyboardEvent) {
    if (!this.allwedChars.includes(event.key.toLowerCase()) && !['Backspace', 'Enter'].includes(event.key)) return;
    const key = event.key;
    if (key.length === 1 && this.word.length < this.MAX_LENGTH) {
      this.word += key.toUpperCase();
      this.guesses[this.currentIndex] = new Guess(this.word.padEnd(this.MAX_LENGTH, ' ').toUpperCase(), Array(this.MAX_LENGTH).fill(0));
    } else if (key === 'Backspace') {
      this.cancelLetter();
    } else if (key === 'Enter') {
      this.submitGuess();
    }
  }

  submitGuess() {
    const word = this.word;
    const currentGameId = this.game.GameId;
    if (!word || !currentGameId) {
      console.error('Current guess control not found');
      return;
    }
    if (word && word.length === this.MAX_LENGTH) {
      this.gameService.postGuess(currentGameId, word.toLowerCase());
    } else {
      console.error('Invalid guess');
    }
  }

  cancelLetter() {
    const currentGuess = this.word;
    if (currentGuess && currentGuess.length > 0) {
      this.word = this.word.slice(0, -1);
      this.guesses[this.currentIndex] = new Guess(this.word.padEnd(this.MAX_LENGTH, ' ').toUpperCase(), Array(this.MAX_LENGTH).fill(0));
    }
  }

  startGame() {
    this.game = new Game();
    this.guesses = Array(this.MAX_GUESSES).fill(' '.repeat(this.MAX_LENGTH));
    console.log('Game started, guesses reset.');
    this.gameService.postStart();
  }

  /** 
   * Returns the color of the letter based on its status in the current guess.
   * @param letter The letter to check.
   * @param row The row index of the guess.
   * @param column The column index of the letter in the guess.
   * @return The color of the letter as a string.
   * Possible values: 'green', 'yellow', 'gray', or '' (empty string for no color).
    */
  getLetterColor(row: number, column: number) {
    if (row >= this.guesses.length || column >= this.MAX_LENGTH) {
      return '';
    }
    const status = this.guesses[row].status[column];
    switch (status) {
      case WordStatus.CORRECT:
        return 'correct';
      case WordStatus.PRESENT:
        return 'present';
      case WordStatus.ABSENT:
        return 'absent';
      default:
        return '';
    }
  }

  keyboardLettersColor(char: string) {
    char = char.toUpperCase();
    if (this.game.CorrectLetters.includes(char)) {
      return 'key-correct';
    } else if (this.game.PresentLetters.includes(char)) {
      return 'key-present';
    } else if (this.game.AbsentLetters.includes(char)) {
      return 'key-absent';
    }
    return '';
  }

  trackByFn(index: number) {
    return index;
  }

  requestLogin() {
    this.authService.login();
  }
}
