import { Equal } from "typeorm";
import { CurseAssignment } from "../../models/CurseAssignment";
import { Player } from "../../models/Player";
import { User } from "../../user";
import { GameLifecycleAction } from "../lifecycle";
import { SupplyPlayer } from "../helper/supplyPlayer";

export type ListActiveCursesArgs = { user: User }

export class ListActiveCurses extends GameLifecycleAction<CurseAssignment[], ListActiveCursesArgs> {
    public async run(): Promise<CurseAssignment[]> {
        const player: Player = await this.callSubAction(SupplyPlayer, { user: this.args.user, withTeam: true });

        return this.entityManager.getRepository(CurseAssignment).find({
            where: {
                cursedTeam: Equal(player.team.uuid),
            },
            relations: {
                curse: true,
                ownerTeam: true
            }
        })
    }
}