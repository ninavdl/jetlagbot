import { GameLifecycleAction } from "./lifecycle";
import { Player } from "../models/Player";
import { Equal } from "typeorm";

export type CreatePlayerArgs = {name: string, telegramUserId: number};

/**
 * If a player with the given telegramUserId already exists, returns it.
 * Otherwise, creates it in the database and returns it.
 */
export class SupplyPlayer extends GameLifecycleAction<Player, CreatePlayerArgs> {
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