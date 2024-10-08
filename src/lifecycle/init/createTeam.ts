import { GameLifecycleAction } from "../lifecycle";
import { Team } from "../../models/Team";
import { Equal, ILike } from "typeorm";
import { GameError } from "../lifecycle";

export type CreateTeamArgs = {name: string};

export class CreateTeam extends GameLifecycleAction<Team, CreateTeamArgs>{
    public async run(): Promise<Team> {
        if(this.game.running) {
            throw new GameError("Game is already running");
        }

        const teamsWithName = await this.entityManager.getRepository(Team).findOneBy({
            name: ILike(this.args.name),
            game: Equal(this.game.uuid)
        });

        if (teamsWithName != null) {
            throw new GameError("There is already a team of this name");
        }

        let team = new Team(this.args.name);
        team.game = this.game;

        await this.entityManager.getRepository(Team).save(team);

        return team;
    }
}