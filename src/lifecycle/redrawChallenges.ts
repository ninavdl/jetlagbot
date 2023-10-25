import { Equal } from "typeorm";
import { Challenge } from "../models/Challenge";
import { User } from "../user";
import { GameError, GameLifecycleAction } from "./lifecycle";
import { Team } from "../models/Team";
import { SupplyPlayer } from "./supplyPlayer";
import { Player } from "../models/Player";
import { chooseNRandom } from "../util";

export type RedrawChallengesArgs = { user: User, stars: number }

export class RedrawChallenges extends GameLifecycleAction<Challenge[], RedrawChallengesArgs> {
    public async run(): Promise<Challenge[]> {
        const player: Player = await this.callSubAction(SupplyPlayer, { user: this.args.user, withTeam: true });

        if(player.team.stars < this.args.stars) {
            throw new GameError("Not enough stars");
        }

        const allChallenges = await Challenge.findNotCompletedByTeam(this.entityManager, player.team.uuid, this.game.uuid);

        player.team.challengesOnHand = chooseNRandom(allChallenges, this.game.numberOfChallengesPerTeam);
        player.team.stars -= this.args.stars;

        await this.entityManager.getRepository(Team).save(player.team);

        return player.team.challengesOnHand;
    }
}