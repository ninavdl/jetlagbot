import { Equal } from "typeorm";
import { Attack } from "../models/Attack";
import { Player } from "../models/Player";
import { User } from "../user";
import { GameError, GameLifecycleAction } from "./lifecycle";
import { SupplyPlayer } from "./supplyPlayer";

export type GetCurrentAttackArgs = {user: User}

export class GetCurrentAttack extends GameLifecycleAction<Attack, GetCurrentAttackArgs> {
    public async run(): Promise<Attack> {
        const player: Player = await this.callSubAction(SupplyPlayer, {user: this.args.user, withTeam: true});

        const attack: Attack = await this.entityManager.getRepository(Attack).findOne({
            relations: {
                battleChallenge: true,
                attackedTeam: true,
                attackingTeam: true,
                subregion: true
            },
            where: [
                {attackedTeam: Equal(player.team.uuid)},
                {attackingTeam: Equal(player.team.uuid)}
            ]
        });

        if (attack == null) {
            throw new GameError("You are currently not part of an attack");
        }

        return attack;
    }
}