import { Equal } from "typeorm";
import { CurseAssignment } from "../models/CurseAssignment";
import { User } from "../user";
import { GameError, GameLifecycleAction } from "./lifecycle";
import { SupplyPlayer } from "./supplyPlayer";
import { Player } from "../models/Player";
import { escapeMarkdown } from "../util";

export type RemoveCurseArgs = { user?: User, curseAssignmentUuid: string, failSilent?: boolean }

export class RemoveCurse extends GameLifecycleAction<void, RemoveCurseArgs> {
    public async run() {
        const assignment = await this.entityManager.getRepository(CurseAssignment)
            .findOne({
                where: {
                    uuid: this.args.curseAssignmentUuid,
                },
                relations: {
                    curse: true,
                    cursedTeam: true,
                    ownerTeam: true
                }
            });

        if (assignment == null) {
            // if the curse was already unassigned by a command,
            // the scheduled unassignment should end without an error message
            if (this.args.failSilent != null && this.args.failSilent) return;
            throw new GameError("No such curse assignment");
        }

        if (this.args.user != null) {
            const player: Player = await this.callSubAction(SupplyPlayer, { user: this.args.user, withTeam: true });
            if (player.team.uuid != assignment.cursedTeam.uuid) {
                throw new GameError("Can't remove curse from other team");
            }
        }

        await this.entityManager.remove(assignment);
        await this.notifier.notifyTeamById(assignment.cursedTeam.uuid, `The curse '${escapeMarkdown(assignment.curse.name)}' was lifed\\!`);
        await this.notifier.notifyTeamById(assignment.ownerTeam.uuid, `The curse '${escapeMarkdown(assignment.curse.name)}' `
            + `you put on team '${escapeMarkdown(assignment.cursedTeam.name)}' was lifted\\!`);
    }
}