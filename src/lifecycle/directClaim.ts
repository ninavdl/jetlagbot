import { Player } from "../models/Player";
import { Subregion } from "../models/Subregion";
import { User } from "../user";
import { escapeMarkdown } from "../util";
import { GameError, GameLifecycleAction } from "./lifecycle";
import { SupplyPlayer } from "./supplyPlayer";

export type DirectClaimArgs = { user: User, subregionUuid: string, stars: number }

export class DirectClaim extends GameLifecycleAction<Subregion, DirectClaimArgs> {
    public async run(): Promise<Subregion> {
        const player: Player = await this.callSubAction(SupplyPlayer, { user: this.args.user, withTeam: true });

        if (player.team.stars < this.args.stars) {
            throw new GameError("Not enough stars");
        }

        const subregion = await this.entityManager.getRepository(Subregion).findOne({
            where: {
                uuid: this.args.subregionUuid
            },
            relations: {
                team: true,
            }
        });

        if (subregion.team != null) {
            throw new GameError("Subregion already claimed");
        }

        player.team.stars -= this.args.stars;
        subregion.team = player.team;
        await this.entityManager.save(subregion);
        await this.entityManager.save(player.team);

        await this.notifier.notifyGroup(`Team '${escapeMarkdown(player.team.name)}' has claimed subregion '${escapeMarkdown(subregion.name)}' using a powerup\\.`);

        return subregion;
    }
}