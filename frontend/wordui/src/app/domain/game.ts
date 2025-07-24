import { GameActionType } from "../service/websocket.service";

export enum GameState {
    ONGOING,
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

    fromJson(json: any): Game {
        this.action = json.action as GameActionType;
        this.game_id = json.game_id;
        this.status = json.status as GameState;
        this.max_guess = json.max_guess;
        this.current_guess = json.current_guess;
        this.guesses = json.guesses.map((guess: Guess) => new Guess(guess.word.toUpperCase(), guess.status)).concat(
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