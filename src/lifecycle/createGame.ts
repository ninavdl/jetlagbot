import { GameLifecycleAction } from "./lifecycle";
import { Game } from "../models/Game";
import { Challenge } from "../models/Challenge";
import { Region } from "../models/Region";
import { Subregion } from "../models/Subregion";
import { BattleChallenge } from "../models/BattleChallenge";
import { Curse } from "../models/Curse";


export type CreateGameArgs = {name: string, telegramMainChatId: number};

export class CreateGame extends GameLifecycleAction<Game, CreateGameArgs> {
    public async run(): Promise<Game> {
        let game = new Game();
        game.name = this.args.name;
        game.mainTelegramChatId = this.args.telegramMainChatId;

        await this.entityManager.save(game);

        return game;
    }
}