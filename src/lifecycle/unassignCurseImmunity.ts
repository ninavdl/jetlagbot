import { Player } from "../models/Player";
import { User } from "../user";
import { escapeMarkdown } from "../util";
import { GameLifecycle, GameLifecycleAction } from "./lifecycle";
import { SupplyPlayer } from "./supplyPlayer";

export type UnassignCurseImmunityArgs = {user: User};

export class UnassignCurseImmunity extends GameLifecycleAction<void, UnassignCurseImmunityArgs> {
    public async run() {
        const player: Player = await this.callSubAction(SupplyPlayer, { user: this.args.user, withTeam: true });

        player.team.curseImmunityUntil = null;
        await this.entityManager.save(player.team);

        await this.notifier.notifyGroup(`Team '${escapeMarkdown(player.team.name)}'s curse immunity has been lifted\\.`);
    }
}