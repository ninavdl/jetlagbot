import { GameLifecycleAction } from "./lifecycle";
import { SupplyPlayer } from "./supplyPlayer";
import { Player } from "../models/Player";
import { User } from "../user";

export type InitPlayerArgs = {user: User, telegramChatId: number}

export class InitPlayer extends GameLifecycleAction<Player, InitPlayerArgs> {
    public async run() {
        const player: Player = await this.callSubAction(SupplyPlayer, {user: this.args.user})
            
        player.telegramChatId = this.args.telegramChatId;

        await this.entityManager.getRepository(Player).save(player);

        return player;
    }
}