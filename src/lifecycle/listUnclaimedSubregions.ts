import { Region } from "../models/Region";
import { Subregion } from "../models/Subregion";
import { Team } from "../models/Team";
import { GameLifecycleAction } from "./lifecycle";

export class ListUnclaimedRegions extends GameLifecycleAction<Subregion[], void> {
    public run(): Promise<Subregion[]> {
        const subregionRepository = this.entityManager.getRepository(Subregion);
        
        return subregionRepository.createQueryBuilder("subregion")
            .leftJoinAndSelect("subregion.region", "region")
            .where("subregion.teamUuid is null")
            .andWhere("gameUuid = :game_uuid", { game_uuid: this.game.uuid })
            .getMany();
    }
}