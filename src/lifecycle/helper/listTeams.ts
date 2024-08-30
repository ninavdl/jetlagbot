import { GameLifecycleAction } from "../lifecycle";
import { Team } from "../../models/Team";
import { Equal } from "typeorm";

export type ListTeamsArgs = {withPlayers?: boolean}

export class ListTeams extends GameLifecycleAction<Team[], ListTeamsArgs> {
    public run(): Promise<Team[]> {
        return this.entityManager.getRepository(Team).find({
            where:{
                game: Equal(this.game.uuid)
            },
            relations: {
                players: this.args.withPlayers != null && this.args.withPlayers
            }
        })
    }
}