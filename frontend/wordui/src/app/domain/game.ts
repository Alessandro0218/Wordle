import { GameActionType } from "../service/websocket.service";
import { User } from "./user";

export enum GameState {
    ONGOING = 1,
    WON,
    LOST
}

export enum WordStatus {
    NOT_GUESSED = 0,
    CORRECT,
    PRESENT,
    ABSENT,
    INCORRECT_LENGTH = 4
}

export class Game {
    private action: GameActionType = GameActionType.STATUS;
    private game_id: string = '';
    private status: GameState = GameState.ONGOING;
    private guesses: Guess[] = [];
    private max_guess: number = 6;
    private current_guess: number = 0;
    private word_length: number = 5;

    get Action(): GameActionType {
        return this.action;
    }
    get GameId(): string {
        return this.game_id;
    }
    get GameStatus(): GameState {
        return this.status;
    }
    get MaxGuess(): number {
        return this.max_guess;
    }
    get CurrentGuess(): number {
        return this.current_guess;
    }
    get Guesses(): Guess[] {
        return this.guesses;
    }
    get WordLength(): number {
        return this.word_length;
    }

    set Action(value: GameActionType) {
        this.action = value;
    }
    set GameId(value: string) {
        this.game_id = value;
    }
    set GameStatus(value: GameState) {
        this.status = value;
    }
    set MaxGuess(value: number) {
        this.max_guess = value;
    }
    set CurrentGuess(value: number) {
        this.current_guess = value;
    }
    set Guesses(value: Guess[]) {
        this.guesses = value;
    }

    get CorrectLetters(): string[] {
        return [...new Set(this.guesses.flatMap(guess =>
            guess.word.split('').map((letter, index) =>
                guess.status[index] === WordStatus.CORRECT ? letter : ''
            )
        ).filter(letter => letter !== ''))];
    }

    get PresentLetters(): string[] {
        return [...new Set(this.guesses.flatMap(guess =>
            guess.word.split('').map((letter, index) =>
                guess.status[index] === WordStatus.PRESENT ? letter : ''
            )
        ).filter(letter => letter !== ''))];
    }

    get AbsentLetters(): string[] {
        return [...new Set(this.guesses.flatMap(guess =>
            guess.word.split('').map((letter, index) =>
                guess.status[index] === WordStatus.ABSENT ? letter : ''
            )
        ).filter(letter => letter !== ''))];
    }

    from_json(json: any): Game {
        this.action = json.action as GameActionType;
        this.game_id = json.game_id;
        this.status = json.status as GameState;
        this.max_guess = json.max_guess;
        this.current_guess = json.current_guess;
        this.guesses = json.guesses.map((guess: any) => new Guess(guess.word.toUpperCase(), guess.status)).concat(
            Array.from({ length: this.max_guess - json.guesses.length }, () => new Guess(' '.repeat(this.word_length), Array(this.max_guess).fill(0)))
        );
        return this;
    }
}

export class Guess {
    word: string = '';
    status: WordStatus[] = [];

    constructor(word: string, status: WordStatus[]) {
        this.word = word;
        this.status = status;
    }

    fromJson(json: any): Guess {
        this.word = json.word;
        this.status = json.status.map((s: number) => s as WordStatus);
        return this;
    }

    toJson(): any {
        return {
            word: this.word,
            status: this.status
        };
    }
}

export class PlayerState {
    player: User;
    ready: boolean;
    online: boolean;
    game: Game;

    constructor(player: User = new User(), ready: boolean = false, online: boolean = false, game: Game = new Game()) {
        this.player = player;
        this.ready = ready;
        this.online = online;
        this.game = game;
    }
    
    get Player() {
        return this.player;
    }
    get Ready() {
        return this.ready;
    }
    get Online() {
        return this.online;
    }
    get Game() {
        return this.game;
    }

    set Player(player: User) {
        this.player = player;
    }
    set Ready(ready: boolean) {
        this.ready = ready;
    }
    set Online(online: boolean) {
        this.online = online;
    }
    set Game(game: Game) {
        this.game = game;
    }

    from_json(json: any) {
        this.player = new User().from_json(json.player);
        this.ready = json.ready;
        this.online = json.online;
        this.game = new Game().from_json(json.game);
        return this;
    }

    to_json() {
        return {
            player: this.player,
            ready: this.ready,
            online: this.online,
            game: this.game
        };
    }

}

export class VersusGame {
    action: string = '';
    game_id: string = '';
    name: string = '';
    status: number = 0;
    winner: User | undefined;
    players: PlayerState[] = [];
    word: string = '';
    max_players: number = 0;
    owner: User | undefined;

    from_json(json: any): VersusGame {
        this.action = json.action;
        this.game_id = json.game_id;
        this.name = json.name;
        this.status = json.status;
        this.winner = json.winner ? new User().from_json(json.winner) : undefined;
        this.players = json.players.map((player: User) => new PlayerState().from_json(player));
        this.max_players = json.max_players;
        this.owner = json.owner ? new User().from_json(json.owner) : undefined;
        this.word = json.word;
        return this;
    }

    to_json(): any {
        return {
            action: this.action,
            game_id: this.game_id,
            name: this.name,
            status: this.status,
            winner: this.winner ? this.winner.to_json() : undefined,
            players: this.players.map(player => player.to_json()),
            max_players: this.max_players,
            owner: this.owner ? this.owner.to_json() : undefined,
            word: this.word
        };
    }
}

export enum VersusState {
    WAITING_FOR_PLAYERS,
    IN_PROGRESS,
    FINISHED
}