import { Challenge } from "../../models/Challenge";
import { Player } from "../../models/Player";
import { Team } from "../../models/Team";
import { User } from "../../user";
import { GameError, GameLifecycleAction } from "../lifecycle";
import { ListTeamChallenges } from "../challenge/listTeamChallenges";
import { SupplyPlayer } from "../helper/supplyPlayer";

export type CardSwapListChallengesArgs = { user: User, teamUuid: string, stars: number }

export type CardSwapListChallengeReturnType = {
    otherChallenges: Challenge[],
    ownChallenges: Challenge[],
    totalNumberOfChallengesOnHand: number
}

export class CardSwapListChallenges extends GameLifecycleAction<CardSwapListChallengeReturnType, CardSwapListChallengesArgs> {
    public async run(): Promise<CardSwapListChallengeReturnType> {
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

        player.team.stars -= this.args.stars;
        await this.entityManager.save(player.team);

        const ownChallenges: Challenge[] = await this.callSubAction(ListTeamChallenges, { user: this.args.user });

        return {
            otherChallenges: otherTeam.challengesOnHand,
            ownChallenges: ownChallenges,
            totalNumberOfChallengesOnHand: this.game.numberOfChallengesPerTeam
        };
    }
}