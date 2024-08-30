import { Equal } from "typeorm";
import { Player } from "../../models/Player";
import { Team } from "../../models/Team";
import { GameError, GameLifecycleAction } from "../lifecycle";
import { User } from "../../user";
import { SupplyPlayer } from "../helper/supplyPlayer";
import { Mission } from "../../models/Misssion";


export type ListTeamMissionsArgs = { user: User, otherTeamUuid?: string, deductStars?: number }

export class ListTeamMissions extends GameLifecycleAction<Mission[], ListTeamMissionsArgs> {
    public async run(): Promise<Mission[]> {
        if (!this.game.running) {
            throw new GameError("Game is not started");
        }

        const player: Player = await this.callSubAction(SupplyPlayer, { user: this.args.user, withTeam: true });
        const teamRepository = this.entityManager.getRepository(Team);

        const team = await teamRepository.findOne({
            where: {
                uuid: Equal(this.args.otherTeamUuid == null ? player.team.uuid : this.args.otherTeamUuid)
            },
            relations: {
                "missionsOnHand": true
            }
        });

        if (this.args.deductStars != null) {
            if(player.team.stars < this.args.deductStars) {
                throw new GameError("Not enough stars");
            }

            player.team.stars -= this.args.deductStars;
            await teamRepository.save(player.team);
        }

        return team.missionsOnHand;
    }
}