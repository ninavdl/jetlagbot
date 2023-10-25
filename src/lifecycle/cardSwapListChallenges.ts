import { Challenge } from "../models/Challenge";
import { Player } from "../models/Player";
import { Team } from "../models/Team";
import { User } from "../user";
import { GameError, GameLifecycleAction } from "./lifecycle";
import { SupplyPlayer } from "./supplyPlayer";

export type CardSwapListChallengesArgs = { user: User, teamUuid: string, stars: number }

export class CardSwapListChallenges extends GameLifecycleAction<Challenge[], CardSwapListChallengesArgs> {
    public async run(): Promise<Challenge[]> {
        const player: Player = await this.callSubAction(SupplyPlayer, { user: this.args.user, withTeam: true });

        if (player.team.stars < this.args.stars) {
            throw new GameError("Not enough stars");
        }

        const otherTeam = await this.entityManager.getRepository(Team)
            .findOne({
                where: {
                    uuid: this.args.teamUuid
                },
                relations: {
                    "challengesOnHand": true
                }
            });

        if (otherTeam == null) {
            throw new GameError("Unknown team");
        }

        return otherTeam.challengesOnHand;
    }
}