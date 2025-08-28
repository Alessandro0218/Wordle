import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment.development';
import { catchError, map, Observable, of, Subject, timeout } from 'rxjs';
import { GameAction, GameActionPayload, GameActionType, WebSocketService, GameErrorType, VersusSocket } from './websocket.service';
import { Game } from '../domain/game';

export enum GameChangedEvent {
  StartSuccess,
  StartError,

  GuessSuccess,
  GuessError,

  StatusSuccess,
  StatusError,
  GameNotFound,
  WordNotValid,

  ListSuccess,
  ListError,
}

export class GameChangedResult {
  event: GameChangedEvent | undefined;
  data: any;
}

@Injectable({
  providedIn: 'root'
})
export class GameService {

  private DEFAULT_TIMEOUT = 5000;
  private onDataChangedEvent: Subject<GameChangedResult> = new Subject<GameChangedResult>();

  constructor(
    private http: HttpClient,
    private wsService: WebSocketService,
  ) {
    this.wsService.onConnection().subscribe(() => {
      this.wsService.onMessage().subscribe((msg: GameAction) => this.handleWSMessage(msg));
    });
  }
  
  ngOnInit(): void {
  }
  
  onDataChanged(): Observable<GameChangedResult> {
    return this.onDataChangedEvent.asObservable();
  }

  handleWSMessage(msg: GameAction): void {
    const result = new GameChangedResult();
    
    switch (msg.action) {
      case GameActionType.STATUS:
        result.event = GameChangedEvent.StatusSuccess;
        result.data = new Game().fromJson(msg);
        this.onDataChangedEvent.next(result);
        break;
      case GameActionType.GUESS:
        result.event = GameChangedEvent.GuessSuccess;
        result.data = new Game().fromJson(msg);
        this.onDataChangedEvent.next(result);
        break;
      case GameActionType.ERROR:
        msg.error = parseInt(msg.error?.toString() || '0', 10);
        switch (msg.error) {
          case GameErrorType.SESSION_NOT_FOUND:
            result.event = GameChangedEvent.GameNotFound;
            break;
          case GameErrorType.INVALID_WORD:
            result.event = GameChangedEvent.WordNotValid;
            break;
          default:
            result.event = GameChangedEvent.StartError;
        }
        this.onDataChangedEvent.next(result);
        break;
      default:
        console.warn('Unknown action type received:', msg.action);
    }
  }

  postStart(timeoutValue: number = this.DEFAULT_TIMEOUT): void {
    this.postStartRequest(timeoutValue).subscribe({
      next: (result: GameChangedResult) => {
        this.onDataChangedEvent.next(result);
      },
      error: (error: any) => {
        const result = new GameChangedResult();
        result.event = GameChangedEvent.StartError;
        result.data = error;
        this.onDataChangedEvent.next(result);
      }
    });
  }

  postGuess(game_id: string, guess: string, timeoutValue: number = this.DEFAULT_TIMEOUT): void {
    this.postGuessRequestWS(new GameAction(GameActionType.GUESS, new GameActionPayload(guess)));
  }

  fetchStatus(game_id: string, timeoutValue: number = this.DEFAULT_TIMEOUT): void {
    this.fetchStatusRequestWS();
  }

  private postStartRequest(timeoutValue: number): Observable<GameChangedResult> {
    const url = `${environment.HOST}:${environment.PORT}/start`;

    return this.http.post(url, {}).pipe(
      timeout(timeoutValue),
      map((response: any) => {
        const result = new GameChangedResult();
        result.event = GameChangedEvent.StartSuccess;
        result.data = response;
        return result;
      }),
      catchError((error: any) => {
        const result = new GameChangedResult();
        result.event = GameChangedEvent.StartError;
        result.data = error;
        return of(result);
      })
    );
  }

  private postGuessRequestWS(guessAction: GameAction): void {
    this.wsService.send(guessAction);
  }

  private fetchStatusRequestWS(): void {
    const statusAction = new GameAction(GameActionType.STATUS);
    this.wsService.send(statusAction);
  }
}

@Injectable({
  providedIn: 'root'
})
export class VersusService {
  private onDataChangedEvent: Subject<GameChangedResult> = new Subject<GameChangedResult>();

  constructor(
    private versusSocket: VersusSocket,
  ) {
    this.versusSocket.onConnection().subscribe(() => {
      this.versusSocket.onMessage().subscribe((msg: GameAction) => this.handleWSMessage(msg));
    });
  }

  onDataChanged(): Observable<GameChangedResult> {
    return this.onDataChangedEvent.asObservable();
  }

  private handleWSMessage(msg: GameAction): void {
    const result = new GameChangedResult();
    switch (msg.action) {
      case GameActionType.STATUS:
        result.event = GameChangedEvent.StatusSuccess;
        result.data = new Game().fromJson(msg);
        this.onDataChangedEvent.next(result);
        break;
      case GameActionType.GUESS:
        result.event = GameChangedEvent.GuessSuccess;
        result.data = new Game().fromJson(msg);
        this.onDataChangedEvent.next(result);
        break;
      case GameActionType.ERROR:
        msg.error = parseInt(msg.error?.toString() || '0', 10);
        switch (msg.error) {
          case GameErrorType.SESSION_NOT_FOUND:
            result.event = GameChangedEvent.GameNotFound;
            break;
          case GameErrorType.INVALID_WORD:
            result.event = GameChangedEvent.WordNotValid;
            break;
          default:
            result.event = GameChangedEvent.StartError;
        }
        this.onDataChangedEvent.next(result);
        break;
      case GameActionType.LIST:
        result.event = GameChangedEvent.ListSuccess;
        result.data = msg.data;
        this.onDataChangedEvent.next(result);
        break;
      default:
        console.warn('Unknown action type received:', msg.action);
    }
  }

  connectList(): void {
    this.versusSocket.connectList();
  }
}