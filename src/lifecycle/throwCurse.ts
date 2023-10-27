import { Equal, IsNull } from "typeorm";
import { CurseAssignment } from "../models/CurseAssignment";
import { Player } from "../models/Player";
import { User } from "../user";
import { GameError, GameLifecycleAction } from "./lifecycle";
import { SupplyPlayer } from "./supplyPlayer";
import { Team } from "../models/Team";
import { escapeMarkdown } from "../util";
import { RemoveCurse } from "./removeCurse";

export type ThrowCurseArgs = { user: User, teamUuid: string, curseUuid: string }

export class ThrowCurse extends GameLifecycleAction<CurseAssignment, ThrowCurseArgs> {
    public async run(): Promise<CurseAssignment> {
        const player: Player = await this.callSubAction(SupplyPlayer, { user: this.args.user, withTeam: true });

        const assignment = await this.entityManager.getRepository(CurseAssignment).findOne({
            where: {
                curse: Equal(this.args.curseUuid),
                cursedTeam: IsNull(),
                ownerTeam: Equal(player.team.uuid)
            },
            relations: {
                curse: true,
            }
        });

        if (assignment == null) {
            throw new GameError("Curse not found on hand");
        }

        const cursedTeam = await this.entityManager.getRepository(Team).findOne({
            where: {
                uuid: Equal(this.args.teamUuid)
            },
            relations: {
                players: true
            }
        });

        if (cursedTeam == null) {
            throw new GameError("No such team");
        }

        assignment.cursedDate = new Date();
        assignment.cursedTeam = cursedTeam;

        await this.entityManager.save(assignment);

        await this.notifier.notifyTeam(cursedTeam, `*Team '${escapeMarkdown(player.team.name)}' has cursed you\\!*\n\n${assignment.curse.toMarkdown()}`);

        if (assignment.curse.timeoutInMinutes != null) {
            this.scheduler.schedule(async (gameLifecycle) => {
                await gameLifecycle.runAction(RemoveCurse, { failSilent: true, curseAssignmentUuid: assignment.uuid });
            }, assignment.curse.timeoutInMinutes * 60);
        }
        return assignment;
    }
}