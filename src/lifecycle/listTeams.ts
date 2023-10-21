import { GameLifecycleAction } from "./lifecycle";
import { Team } from "../models/Team";
import { Equal } from "typeorm";

export class ListTeams extends GameLifecycleAction<Team[], void> {
    public run(): Promise<Team[]> {
        return this.entityManager.getRepository(Team).findBy({
            game: Equal(this.game.uuid)
        })
    }
}