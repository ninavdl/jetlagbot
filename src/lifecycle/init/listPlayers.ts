import { GameLifecycleAction } from "../lifecycle";
import { Player } from "../../models/Player"
import { Equal } from "typeorm";

export class ListPlayers extends GameLifecycleAction<Player[], void>{
    public async run(): Promise<Player[]> {
        const players = await this.entityManager.getRepository(Player).find({
            where: { game: Equal(this.game.uuid) },
            relations: [ "team" ]
        });

        return players;
    }
}