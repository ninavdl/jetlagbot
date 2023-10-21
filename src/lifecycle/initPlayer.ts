import { GameLifecycleAction } from "./lifecycle";
import { SupplyPlayer } from "./supplyPlayer";
import { Player } from "../models/Player";

export type InitPlayerArgs = {name: string, telegramUserId: number, telegramChatId: number}

export class InitPlayer extends GameLifecycleAction<Player, InitPlayerArgs> {
    public async run() {
        const player: Player = await this.callSubAction(SupplyPlayer, {name: this.args.name, telegramUserId: this.args.telegramUserId})
            
        player.telegramChatId = this.args.telegramChatId;

        await this.entityManager.getRepository(Player).save(player);

        return player;
    }
}