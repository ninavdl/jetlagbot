import { Equal, In } from "typeorm";
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

        if (player.team.stars < this.args.stars) {
            throw new GameError("Not enough stars");
        }

        const availableChallenges = await Challenge.findUuidsNotCompletedByTeam(this.entityManager, player.team.uuid, this.game.uuid);

        const selectedChallenges = chooseNRandom(availableChallenges, this.game.numberOfChallengesPerTeam);
        player.team.stars -= this.args.stars;

        await this.entityManager.getRepository(Team).save(player.team);

        await Team.replaceAllChallengesOnHand(this.entityManager, player.team.uuid, selectedChallenges);

        const newChallenegs = await this.entityManager.getRepository(Challenge).findBy({ uuid: In(selectedChallenges) });

        await this.notifier.notifyTeamById(player.team.uuid, `Your new challenges are:\n\n` + 
            newChallenegs.map(c => c.toMarkdown()).join("\n\n")
        );

        return newChallenegs;
    }
}