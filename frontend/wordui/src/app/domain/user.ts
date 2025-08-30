export class User {
    id: number | undefined;
    discord_id: string | undefined;
    discord_username: string | undefined;
    discord_avatar: string | undefined;

    from_json(json: any): User {
        this.id = json.id;
        this.discord_id = json.discord_id;
        this.discord_username = json.discord_username;
        this.discord_avatar = json.discord_avatar;
        return this;
    }

    to_json(): any {
        return {
            id: this.id,
            discord_id: this.discord_id,
            discord_username: this.discord_username,
            discord_avatar: this.discord_avatar
        };
    }
}
