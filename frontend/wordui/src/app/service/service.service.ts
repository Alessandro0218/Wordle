import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment.development';
import { catchError, map, Observable, of, Subject, timeout } from 'rxjs';

export enum GameChangedEvent {
  StartSuccess,
  StartError,

  GuessSuccess,
  GuessError,

  StatusSuccess,
  StatusError,
  GameNotFound,
  WordNotValid,
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

  constructor(private http: HttpClient) { }
  
  onDataChanged(): Observable<GameChangedResult> {
    return this.onDataChangedEvent.asObservable();
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
    this.postGuessRequest(game_id, guess, timeoutValue).subscribe({
      next: (result: GameChangedResult) => {
        if (result.data.status === 400) {
          result.event = GameChangedEvent.WordNotValid;
        }
        this.onDataChangedEvent.next(result);
      },
      error: (error: any) => {
        const result = new GameChangedResult();
        result.event = GameChangedEvent.GuessError;
        result.data = error;
        this.onDataChangedEvent.next(result);
      }
    });
  }

  fetchStatus(game_id: string, timeoutValue: number = this.DEFAULT_TIMEOUT): void {
    this.fetchStatusRequest(game_id, timeoutValue).subscribe({
      next: (result: GameChangedResult) => {
        if (result.data.status === 404) {
          result.event = GameChangedEvent.GameNotFound;
        }
        this.onDataChangedEvent.next(result);
      },
      error: (error: any) => {
        const result = new GameChangedResult();
        result.event = GameChangedEvent.StatusError;
        result.data = error;
        this.onDataChangedEvent.next(result);
      }
    });
  }

  /* REQUESTS */

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

  private postGuessRequest(game_id: string, guess: string, timeoutValue: number): Observable<GameChangedResult> {
    const url = `${environment.HOST}:${environment.PORT}/guess`;
    
    const body = { 
      game_id: game_id, 
      guess: guess 
    };

    return this.http.post(url, body).pipe(
      timeout(timeoutValue),
      map((response: any) => {
        const result = new GameChangedResult();
        result.event = GameChangedEvent.GuessSuccess;
        result.data = response;
        return result;
      }),
      catchError((error: any) => {
        const result = new GameChangedResult();
        result.event = GameChangedEvent.GuessError;
        result.data = error;
        return of(result);
      })
    );
  }

  fetchStatusRequest(game_id: string, timeoutValue: number = this.DEFAULT_TIMEOUT): Observable<GameChangedResult> {
    const url = `${environment.HOST}:${environment.PORT}/status/${game_id}`;
    
    return this.http.get(url).pipe(
      timeout(timeoutValue),
      map((response: any) => {
        const result = new GameChangedResult();
        result.event = GameChangedEvent.StatusSuccess;
        result.data = response;
        return result;
      }),
      catchError((error: any) => {
        const result = new GameChangedResult();
        result.event = GameChangedEvent.StatusError;
        result.data = error;
        return of(result);
      })
    );
  }

}
