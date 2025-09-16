import { CommonModule } from '@angular/common';
import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Game, GameState, Guess, PlayerState, VersusGame, VersusState, WordStatus } from 'domain/game';
import { DialogModule } from 'primeng/dialog';
import { AuthChangedEvent, AuthService } from 'service/auth.service';
import { GameChangedEvent, VersusService } from 'service/game.service';
import { TooltipModule } from "primeng/tooltip";
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';

@Component({
  selector: 'app-versus',
  standalone: true,
  imports: [
    CommonModule,
    DialogModule,
    TooltipModule,
    ToastModule,
  ],
  templateUrl: './versus.component.html',
  styleUrl: './versus.component.css'
})
export class VersusComponent implements OnInit, OnDestroy {

  visible: boolean = true;
  game: VersusGame = new VersusGame();

  myId = this.authService.DiscordId;

  subscriptions: any[] = [];

  VersusState = VersusState;

  allwedChars: string[] = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.toLowerCase().split('');

  MAX_LENGTH: number = 5;
  MAX_GUESSES: number = 6;

  correctLetters: string[] = [];
  presentLetters: string[] = [];
  absentLetters: string[] = [];

  word: string = '';

  shakeAnimation = false;

  myGuesses: Guess[] = Array(this.MAX_GUESSES).fill(new Guess(' '.repeat(this.MAX_LENGTH), []));

  canShowDialog: boolean = false;
  hideModal: boolean = false;

  blockKeyboard: boolean = false;
  slowInternetTimeout: any;

  constructor(
    private versusService: VersusService,
    private authService: AuthService,
    private route: ActivatedRoute,
    private router: Router,
    private messageService: MessageService, 
  ) { }

  get myGame(): Game {
    return this.game.players.find(p => p.Player.discord_id === this.myId)?.Game || new Game();
  }
  get isGameWon(): boolean {
    return this.canShowDialog && !this.hideModal && this.myGame.GameStatus === GameState.WON;
  }
  get isGameLost(): boolean {
    return this.canShowDialog && !this.hideModal && this.myGame.GameStatus === GameState.LOST;
  }
  
  get currentIndex() {
    return this.myGame.CurrentGuess;
  }

  get guesses(): Guess[] {
    return this.myGuesses;
  }
  set guesses(value: string[]) {
    this.myGuesses = value.map(word => {
      const status = Array(this.MAX_LENGTH).fill(0);
      return new Guess(word.toUpperCase(), status);
    });
  }

  get isPlayerReady(): boolean {
    return this.game.players.find(p => p.Player.discord_id === this.myId)?.Ready || false;
  }

  get friends(): PlayerState[] {
    return this.game.players.filter(p => p.Player.discord_id !== this.myId && p.Online);
  }

  friendsRows(friend: PlayerState): number[] {
    return Array.from({ length: friend.Game.MaxGuess }, (_, i) => i);
  }

  friendsColumns(friend: PlayerState): number[] {
    return Array.from({ length: friend.Game.WordLength }, (_, i) => i);
  }

  getFriendLetterState(friend: PlayerState, guessIndex: number, letterIndex: number) {
    const guess = friend.Game.Guesses[guessIndex];
    if (!guess) return '';

    const status = guess.status[letterIndex];
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
    this.subscriptions.push(this.versusService.onJoinRoom().subscribe((game: VersusGame) => {
      this.game = game;
      this.versusService.connectToServer(game.game_id);
    }));

    this.subscriptions.push(this.versusService.onDataChanged().subscribe({
      next: (args) => {
        const data = args.data as VersusGame;  
        switch (args.event) {
          case GameChangedEvent.EnterSuccess:
            this.game = args.data;
            break;
          case GameChangedEvent.EnterError:
            this.navigateToList();
            break;
          case GameChangedEvent.StatusSuccess:
            this.game = data;
            this.myGame.Guesses.forEach((guess, index) => {
              if (index !== this.currentIndex) {
                this.myGuesses[index] = guess;
              }
            });
            if (this.myGame.GameStatus === GameState.WON || this.myGame.GameStatus === GameState.LOST) {
              setTimeout(() => {
                this.canShowDialog = true;
              }, 2000);
            }
            break;
          case GameChangedEvent.GuessSuccess:
            this.blockKeyboard = false;
            clearTimeout(this.slowInternetTimeout);
            this.game = data;
            this.word = '';
            if (this.myGame.GameStatus === GameState.WON || this.myGame.GameStatus === GameState.LOST) {
              setTimeout(() => {
                this.canShowDialog = true;
              }, 2000);
            }
            break;
          case GameChangedEvent.WordNotValid:
            this.shakeAnimation = true;
            setTimeout(() => {
              this.shakeAnimation = false;
            }, 500);
            break;
          case GameChangedEvent.GameNotFound:
            this.navigateToList();
            this.messageService.add({ severity: 'error', summary: 'Errore', detail: 'La partita non esiste più' });
            break;
          default:
            break;
        }
      }
    }));

    this.authService.onDataChanged().subscribe({
      next: (args) => {
        switch (args.event) {
          case AuthChangedEvent.UserDataFetched:
            this.myId = this.authService.DiscordId;
            break;
          default:
            break;
        }
      }
    });

    this.connectoToGame();

  }

  ngOnDestroy() {
    this.subscriptions.forEach(subscription => subscription.unsubscribe());
    this.versusService.disconnect();
  }

  getGameIdFromRoute(): string {
    const url = this.route.snapshot.params['game_id'];
    return url ? url : '';
  }

  connectoToGame(): void {
    const code = this.getGameIdFromRoute().substring(0, 5);
    this.versusService.enterRoom(code);
  }

  toggleReady(): void {
    this.versusService.toggleReady();
  }

  onlinePlayers(): PlayerState[] {
    return this.game.players.filter(p => p.online);
  }

  startGame(): void {
    this.versusService.startGame();
  }

  canStartGame(): boolean {
    if (this.myId !== this.game.owner?.discord_id) {
      return false;
    }
    return this.game.players.length === this.game.max_players && this.game.players.filter(p => p.Player.discord_id !== this.game.owner?.discord_id).every(p => p.Ready && p.Online);
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
    const currentGameId = this.myGame.GameId;
    if (!word || !currentGameId) {
      console.error('Current guess control not found');
      return;
    }
    if (word && word.length === this.MAX_LENGTH) {
      this.versusService.postGuess(currentGameId, word.toLowerCase());
      this.blockKeyboard = true;
      this.slowInternetTimeout = setTimeout(() => {
        this.messageService.add({ severity: 'error', summary: 'Internet', detail: 'Connessione rallentata!' });
      }, 2000);
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
    if (this.myGame.CorrectLetters.includes(char)) {
      return 'key-correct';
    } else if (this.myGame.PresentLetters.includes(char)) {
      return 'key-present';
    } else if (this.myGame.AbsentLetters.includes(char)) {
      return 'key-absent';
    }
    return '';
  }

  trackByFn(index: number) {
    return index;
  }

  navigateToList() {
    this.router.navigate(['/servers-list']);
  }
}
