import { Game } from "../models/Game";
import { GameLifecycleAction } from "./lifecycle";

export type GetGameArgs = {
    withGeoJson?: boolean
}

export class GetGame extends GameLifecycleAction<Game, GetGameArgs> {
    public async run(): Promise<Game> {
        if(this.args != null && this.args.withGeoJson != null && this.args.withGeoJson) {
            return this.entityManager.getRepository(Game).findOne({
                where: {
                    uuid: this.game.uuid
                },
                select: {
                    geoJson: true
                }
            })
        }

        return this.game;
    }
}