import { Player } from "../models/Player";
import { User } from "../user";
import { escapeMarkdown } from "../util";
import { GameError, GameLifecycleAction } from "./lifecycle";
import { SupplyPlayer } from "./supplyPlayer";

export type CurseImmunityArgs = { user: User, stars: number, minutes: number };

export class CurseImmunity extends GameLifecycleAction<void, CurseImmunityArgs> {
    public async run() {
        const now = new Date();
        const end = new Date(now.getTime() + this.args.minutes * 60000);

        const player: Player = await this.callSubAction(SupplyPlayer, { user: this.args.user, withTeam: true });

        if (player.team.stars < this.args.stars) {
            throw new GameError("You don't have enough stars for this powerup");
        }

        if (player.team.curseImmunityUntil != null && player.team.curseImmunityUntil >= now) {
            throw new GameError("Your team already has curse immunity");
        }

        player.team.curseImmunityUntil = end;
        player.team.stars -= this.args.stars;

        await this.notifier.notifyGroup(`Team '${escapeMarkdown(player.team.name)}' can't be cursed for ${this.args.minutes}min\\.`);
        
        await this.entityManager.save(player.team);
    }
}