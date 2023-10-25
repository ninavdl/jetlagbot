import { Equal, In } from "typeorm";
import { Challenge } from "../models/Challenge";
import { Player } from "../models/Player";
import { Team } from "../models/Team";
import { GameError, GameLifecycleAction } from "./lifecycle";
import { User } from "../user";
import { SupplyPlayer } from "./supplyPlayer";


export type ListTeamChallengesArgs = { user: User }

export class ListTeamChallenges extends GameLifecycleAction<Challenge[], ListTeamChallengesArgs> {
    public async run(): Promise<Challenge[]> {
        if (!this.game.running) {
            throw new GameError("Game is not started");
        }

        let player: Player = await this.callSubAction(SupplyPlayer, { user: this.args.user, withTeam: true });

        return (await this.entityManager.getRepository(Team)
            .findOne({
                where: {
                    uuid: Equal(player.team.uuid)
                },
                relations: {
                    "challengesOnHand": true
                }
            })).challengesOnHand;
    }
}