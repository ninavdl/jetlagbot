import { Player } from "../models/Player";
import { User } from "../user";
import { escapeMarkdown } from "../util";
import { GameLifecycleAction } from "./lifecycle";
import { SupplyPlayer } from "./supplyPlayer";

export type UnassignLocationPowerupArgs = { user: User }
export class UnassignLocationPowerup extends GameLifecycleAction<void, UnassignLocationPowerupArgs> {
    public async run() {
        const player: Player = await this.callSubAction(SupplyPlayer, { user: this.args.user, withTeam: true });

        await this.notifier.notifyTeamById(player.team.uuid, escapeMarkdown("Powerup ended. You have to turn your location back on now!"));
        await this.notifier.notifyGroup(`Team '${escapeMarkdown(player.team.name)}' must turn their location back on\\!`)
    }
}