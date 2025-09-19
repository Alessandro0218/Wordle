import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { catchError, map, Observable, Subject, timeout } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { User } from '../domain/user';

export enum AuthChangedEvent {
  UserDataFetched,
  UserDataError,
  LoggedOut,
  LoggedOutError
}

export class AuthChangedResult {
  event: AuthChangedEvent | undefined;
  data: any;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private DEFAULT_TIMEOUT = 5000;
  private onDataChangedEvent: Subject<AuthChangedResult> = new Subject<AuthChangedResult>();

  private id: number = 0;
  private discord_id: string = '';
  private discord_username: string = '';
  private discord_avatar: string = '';

  get isLoggedIn(): boolean {
    return this.Id !== 0 && this.DiscordUsername !== '' && this.DiscordAvatar !== '';
  }

  constructor(
    private http: HttpClient,
  ) { }

  get Id(): number {
    return this.id;
  }

  get DiscordId(): string {
    return this.discord_id ? this.discord_id : '';
  }

  get DiscordUsername(): string {
    return this.discord_username;
  }

  get DiscordAvatar(): string {
    return this.discord_avatar;
  }

  set Id(value: number) {
    this.id = value;
  }

  set DiscordId(value: string) {
    this.discord_id = value;
  }

  set DiscordUsername(value: string) {
    this.discord_username = value;
  }

  set DiscordAvatar(value: string) {
    this.discord_avatar = value;
  }

  onDataChanged(): Observable<AuthChangedResult> {
    return this.onDataChangedEvent.asObservable();
  }

  login() {
    const url = `${environment.HOST}:${environment.PORT}/auth/discord/login`;
    window.location.href = url;
  }

  logout() {
    this.postLogoutRequest().subscribe({
      next: (result) => {
        this.Id = 0;
        this.DiscordId = '';
        this.DiscordUsername = '';
        this.DiscordAvatar = '';
        this.onDataChangedEvent.next({ event: AuthChangedEvent.LoggedOut, data: result });
      },
      error: (error) => {
        this.onDataChangedEvent.next({ event: AuthChangedEvent.LoggedOutError, data: error });
      }
    });
  }

  fetchUserData(timeoutValue: number = this.DEFAULT_TIMEOUT): void {
    this.fetchUserDataRequest(timeoutValue).subscribe({
      next: (result: AuthChangedResult) => {
        this.onDataChangedEvent.next(result);
      },
      error: (error: any) => {
        const result = new AuthChangedResult();
        result.event = AuthChangedEvent.UserDataError;
        result.data = error;
        this.onDataChangedEvent.next(result);
      }
    });
  }

  fetchUserDataRequest(timeoutValue: number = this.DEFAULT_TIMEOUT): Observable<AuthChangedResult> {
    const url = `${environment.HOST}:${environment.PORT}/auth/user`;
    
    return this.http.get<User>(url, { withCredentials: true }).pipe(
      timeout(timeoutValue),
      map((data: User) => {
        const result = new AuthChangedResult();
        result.event = AuthChangedEvent.UserDataFetched;
        result.data = data;
        this.Id = data.id;
        this.DiscordId = data.discord_id;
        this.DiscordUsername = data.discord_username;
        this.DiscordAvatar = data.discord_avatar;
        return result;
      }),
      catchError((error: any) => {
        const result = new AuthChangedResult();
        result.event = AuthChangedEvent.UserDataError;
        result.data = error;
        return [result];
      })
    );
  }

  postLogoutRequest(timeoutValue: number = this.DEFAULT_TIMEOUT): Observable<any> {
    const url = `${environment.HOST}:${environment.PORT}/auth/logout`;
    return this.http.post(url, {}, { withCredentials: true }).pipe(
      timeout(timeoutValue),
      catchError((error: any) => {
        console.error('Logout error:', error);
        return [error];
      })
    );
  }
}
