import { GameLifecycleAction } from "./lifecycle";
import { Player } from "../models/Player";
import { Equal } from "typeorm";
import { User } from "../user";

export type CreatePlayerArgs = {user: User, withTeam?: boolean};

/**
 * If a player with the given telegramUserId already exists, returns it.
 * Otherwise, creates it in the database and returns it.
 */
export class SupplyPlayer extends GameLifecycleAction<Player, CreatePlayerArgs> {
    public async run(): Promise<Player> {
        const playerRepo = this.entityManager.getRepository(Player);
        let player = await playerRepo.findOne({
            where: {
                game: Equal(this.game.uuid),
                telegramId: this.args.user.telegramUserId
            },
            relations: {
                team: this.args.withTeam != null && this.args.withTeam === true
            }
        });
        if(player == null) {
            player = new Player(this.args.user.displayName, this.args.user.telegramUserId);
            player.game = this.game;
            await playerRepo.save(player);
        }
        return player;
    }
}