import { Equal } from "typeorm";
import { BattleChallenge } from "../models/BattleChallenge";
import { Player } from "../models/Player";
import { Subregion } from "../models/Subregion";
import { User } from "../user";
import { GameError, GameLifecycleAction } from "./lifecycle";
import { SupplyPlayer } from "./supplyPlayer";
import { chooseRandom, escapeMarkdown, random } from "../util";
import { Attack } from "../models/Attack";

export type AssignBattleChallengeArgs = { user: User, subregionUuid: string }

export class AssignBattleChallenge extends GameLifecycleAction<Attack, AssignBattleChallengeArgs> {
    public async run(): Promise<Attack> {
        const player: Player = await this.callSubAction(SupplyPlayer, { user: this.args.user, withTeam: true });

        const subregion: Subregion = await this.entityManager.getRepository(Subregion)
            .findOne({
                where: { uuid: this.args.subregionUuid },
                relations: { currentAttack: true, team: true }
            });

        // Check preconditions

        if (subregion.currentAttack != null) {
            throw new GameError("Subregion is already under attack");
        }

        if (subregion.team == null) {
            throw new GameError("Can't attack unclaimed subregion")
        }

        if (subregion.team.uuid == player.team.uuid) {
            throw new GameError("Can't attack subregion claimed by yourself");
        }

        const battleChallengeUuids = await BattleChallenge.findUuidsNotCompletedByTeams(
            this.entityManager, player.team.uuid, subregion.team.uuid, this.game.uuid
        );
        
        // Assign battle challenge
        const battleChallengeUuid = chooseRandom(battleChallengeUuids);
        const battleChallenge = await this.entityManager.getRepository(BattleChallenge).findOneBy({ uuid: battleChallengeUuid });

        // Create attack element
        const attack = new Attack()
        attack.attackingTeam = player.team;
        attack.attackedTeam = subregion.team;
        attack.battleChallenge = battleChallenge;
        attack.subregion = subregion;

        await this.entityManager.save(attack);

        await this.notifier.notifyTeamById(attack.attackedTeam.uuid,
            `**You are under attack\\!**\n` +
            `Your subregion '${escapeMarkdown(subregion.name)}' was attacked by team ${escapeMarkdown(player.team.name)}\\.\n\n` +
            `The battle challenge is:\n` +
            `${battleChallenge.toMarkdown()}\n\n` +
            `**The time starts now\\!**`,
        );
        await this.notifier.notifyTeamById(attack.attackingTeam.uuid,
            `Assigned battle challenge:\n` +
            `${battleChallenge.toMarkdown()}\n\n` +
            `**The time starts now\\!**`
        )

        return attack;
    }
}