import { Player } from "../../models/Player";
import { User } from "../../user";
import { GameLifecycleAction } from "../lifecycle";
import { SupplyPlayer } from "./supplyPlayer";

export type CheckAdminArgs = { user: User }

export class CheckAdmin extends GameLifecycleAction<boolean, CheckAdminArgs> {
    public async run(): Promise<boolean> {
        const player: Player = await this.callSubAction(SupplyPlayer, { user: this.args.user });
        return player.isAdmin;
    }
}