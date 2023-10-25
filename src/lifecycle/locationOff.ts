import { Player } from "../models/Player";
import { User } from "../user";
import { escapeMarkdown } from "../util";
import { GameError, GameLifecycleAction } from "./lifecycle";
import { SupplyPlayer } from "./supplyPlayer";

export type LocationOffArgs = {user: User, stars: number}

export class LocationOff extends GameLifecycleAction<void, LocationOffArgs> {
    public async run() {
        const player: Player = await this.callSubAction(SupplyPlayer, {user: this.args.user, withTeam: true});
        
        if(player.team.stars < this.args.stars) {
            throw new GameError("Not enough stars");
        }

        player.team.stars -= this.args.stars;

        await this.notifier.notifyGroup(`Team '${escapeMarkdown(player.team.name)}' has bought a powerup and can now disable their location for 1 hour\\.`);
        
        await this.entityManager.save(player.team);
    }
}