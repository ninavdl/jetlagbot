import { IsNull, Not } from "typeorm";
import { Subregion } from "../../models/Subregion";
import { GameLifecycleAction } from "../lifecycle";

export class ListClaimedSubregions extends GameLifecycleAction<Subregion[], void> {
    public async run(): Promise<Subregion[]> {
        return this.entityManager.getRepository(Subregion).createQueryBuilder("subregion")
            .leftJoinAndSelect("subregion.region", "region")
            .leftJoinAndSelect("subregion.team", "team")
            .where("subregion.teamUuid is not null")
            .andWhere("region.gameUuid = :game_uuid", { game_uuid: this.game.uuid })
            .getMany();

    }
}