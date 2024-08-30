import { Equal, IsNull } from "typeorm";
import { Curse } from "../../models/Curse";
import { CurseAssignment } from "../../models/CurseAssignment";
import { Player } from "../../models/Player";
import { User } from "../../user";
import { GameLifecycleAction } from "../lifecycle";
import { SupplyPlayer } from "../helper/supplyPlayer";

export type ListCursesOnHandArgs = {user: User}

export class ListCursesOnHand extends GameLifecycleAction<Curse[], ListCursesOnHandArgs> {
    public async run(): Promise<Curse[]> {
        const player: Player = await this.callSubAction(SupplyPlayer, {user: this.args.user, withTeam: true});

        return (await this.entityManager.getRepository(CurseAssignment).find({
            where: {
                ownerTeam: Equal(player.team.uuid),
                cursedTeam: IsNull()
            },
            relations: {
                curse: true
            }
        })).map(assignment => assignment.curse);
    }
}