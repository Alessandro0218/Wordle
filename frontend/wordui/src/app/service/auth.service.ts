import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { catchError, map, Observable, Subject, timeout } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { User } from '../domain/user';

export enum AuthChangedEvent {
  UserDataFetched,
  UserDataError,
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

  private id: number | undefined;
  private discord_username: string | undefined;
  private discord_avatar: string | undefined;

  get isLoggedIn(): boolean {
    return this.Id !== undefined && this.DiscordUsername !== undefined && this.DiscordAvatar !== undefined;
  }

  constructor(
    private http: HttpClient,
  ) { }

  get Id(): number | undefined {
    return this.id;
  }

  get DiscordId(): string | undefined {
    return this.id ? this.id.toString() : undefined;
  }

  get DiscordUsername(): string | undefined {
    return this.discord_username;
  }

  get DiscordAvatar(): string | undefined {
    return this.discord_avatar;
  }

  set Id(value: number | undefined) {
    this.id = value;
  }

  set DiscordId(value: string | undefined) {
    this.id = value ? parseInt(value, 10) : undefined;
  }

  set DiscordUsername(value: string | undefined) {
    this.discord_username = value;
  }

  set DiscordAvatar(value: string | undefined) {
    this.discord_avatar = value;
  }

  onDataChanged(): Observable<AuthChangedResult> {
    return this.onDataChangedEvent.asObservable();
  }

  login() {
    const url = `${environment.HOST}:${environment.PORT}/auth/discord/login`;
    window.location.href = url;
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
}
