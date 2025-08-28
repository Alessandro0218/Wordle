// websocket.service.ts
import { Injectable } from '@angular/core';
import { webSocket, WebSocketSubject } from 'rxjs/webSocket';
import { Observable, Subject } from 'rxjs';
import { environment } from '../../environments/environment.development';

export enum GameErrorType {
  GENERAL_ERROR = 0,
  SESSION_NOT_FOUND = 1,
  INVALID_WORD = 2,
}

export enum GameActionType {
  STATUS = 'status',
  GUESS = 'guess',
  ERROR = 'error',
  LIST = 'list',
}

export class GameActionPayload {
  guess: string = '';
  
  constructor(guess: string = '') {
    this.guess = guess;
  }

  fromJson(json: any): this {
    this.guess = json.guess;
    return this;
  }

  toJson(): any {
    return {
      guess: this.guess,
    };
  }
}

export class GameAction {
  action: string;
  data: GameActionPayload;
  error: GameErrorType | undefined;

  constructor(type: string = GameActionType.STATUS, payload: GameActionPayload = new GameActionPayload(), error?: GameErrorType) {
    this.action = type;
    this.data = payload;
    this.error = error;
  }

  fromJson(json: any): void {
    this.action = json.action;
    this.data = new GameActionPayload().fromJson(json.data);
    this.error = json.error;
  }

  toJson(): any {
    return {
      action: this.action,
      data: this.data.toJson(),
      error: this.error,
    };
  }
}

@Injectable({
  providedIn: 'root'
})
export class WebSocketService {
  private socket$: WebSocketSubject<any> | undefined;

  private SocketConnectedEvent: Subject<void> = new Subject<void>();

  constructor() {}

  onConnection(): Observable<void> {
    return this.SocketConnectedEvent.asObservable();
  }

  connect(game_id: string): void {
    this.socket$ = webSocket(`${environment.WS_HOST}:${environment.WS_PORT}/wordle/${game_id}`);
    this.SocketConnectedEvent.next();
  }

  send(game_action: GameAction): void {
    if (!this.socket$) {
      console.error('WebSocket is not connected.');
      return;
    }
    this.socket$.next(game_action.toJson());
  }

  onMessage(): Observable<GameAction> {
    if (!this.socket$) {
      console.error('WebSocket is not connected.');
      return new Observable<GameAction>();
    }
    return this.socket$.asObservable();
  }

  close(): void {
    if (!this.socket$) {
      console.error('WebSocket is not connected.');
      return;
    }
    this.socket$.complete();
    this.socket$ = undefined;
  }
}

@Injectable({
  providedIn: 'root'
})
export class VersusSocket {
  private socket$: WebSocketSubject<any> | undefined;

  private SocketConnectedEvent: Subject<void> = new Subject<void>();

  constructor() {}

  onConnection(): Observable<void> {
    return this.SocketConnectedEvent.asObservable();
  }

  connectList(): void {
    this.socket$ = webSocket(`${environment.WS_HOST}:${environment.WS_PORT}/versus/list`);
    this.SocketConnectedEvent.next();
  }

  connect(game_id: string): void {
    this.socket$ = webSocket(`${environment.WS_HOST}:${environment.WS_PORT}/versus/${game_id}`);
    this.SocketConnectedEvent.next();
  }

  send(message: any): void {
    if (!this.socket$) {
      console.error('WebSocket is not connected.');
      return;
    }
    this.socket$.next(message);
  }

  onMessage(): Observable<any> {
    if (!this.socket$) {
      console.error('WebSocket is not connected.');
      return new Observable<any>();
    }
    return this.socket$.asObservable();
  }

  close(): void {
    if (!this.socket$) {
      console.error('WebSocket is not connected.');
      return;
    }
    this.socket$.complete();
    this.socket$ = undefined;
  }
}