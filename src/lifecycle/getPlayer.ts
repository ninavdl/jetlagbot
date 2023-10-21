import { Player } from "../models/Player";
import { GameLifecycleAction } from "./lifecycle";
import { Equal } from "typeorm";

export type GetPlayerArgs = {name: string, telegramUserId: number}

export class GetPlayer extends GameLifecycleAction<Player, GetPlayerArgs> {
    public async run(): Promise<Player> {
        const playerRepo = this.entityManager.getRepository(Player);
        let player = await playerRepo.findOneBy({
            game: Equal(this.game.uuid),
            telegramId: this.args.telegramUserId
        });
        if(player == null) {
            player = new Player(this.args.name, this.args.telegramUserId);
            player.game = this.game;
            playerRepo.save(player);
        }
        return player;
    }
}