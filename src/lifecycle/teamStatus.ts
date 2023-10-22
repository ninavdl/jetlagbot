import { Equal } from "typeorm";
import { Player } from "../models/Player";
import { Subregion } from "../models/Subregion";
import { User } from "../user";
import { GameError, GameLifecycleAction } from "./lifecycle";
import { SupplyPlayer } from "./supplyPlayer";

export type GetTeamStatusArgs = { user: User }
export type TeamStatus = { stars: number, subregions: number }

export class GetTeamStatus extends GameLifecycleAction<TeamStatus, GetTeamStatusArgs> {
    public async run(): Promise<TeamStatus> {
        if (!this.game.running) {
            throw new GameError("The game is not running yet");
        }

        let player: Player = await this.callSubAction(SupplyPlayer, { user: this.args.user, withTeam: true });
        let subregions = await this.entityManager.count(Subregion, { where: { team: Equal(player.team.uuid) } });

        return { stars: player.team.stars, subregions: subregions }
    }
}