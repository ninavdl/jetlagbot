import { Equal } from "typeorm";
import { Attack } from "../../models/Attack";
import { GameError, GameLifecycleAction } from "../lifecycle";
import { escapeMarkdown } from "../../util";

export type CompleteBattleChallengeArgs = { attackUuid: string, winningTeamUuid: string }

export class CompleteBattleChallenge extends GameLifecycleAction<void, CompleteBattleChallengeArgs> {
    public async run() {
        const attack: Attack = await this.entityManager.getRepository(Attack).findOne({
            where: { uuid: Equal(this.args.attackUuid) },
            relations: { battleChallenge: true, attackedTeam: true, attackingTeam: true, subregion: true }
        });

        if (attack == null) {
            throw new GameError("No such attack");
        }

        if (attack.attackedTeam.uuid != this.args.winningTeamUuid && attack.attackingTeam.uuid != this.args.winningTeamUuid) {
            throw new GameError("Team is not part of this attack");
        }

        attack.subregion.attackLocked = true;

        if (this.args.winningTeamUuid == attack.attackingTeam.uuid) {
            attack.subregion.team = attack.attackingTeam;
            await this.notifier.notifyGroup(`Team '${escapeMarkdown(attack.attackingTeam.name)}' has conquered subregion ` +
                `'${escapeMarkdown(attack.subregion.name)}' from team '${escapeMarkdown(attack.attackedTeam.name)}`);
        } else {
            await this.notifier.notifyGroup(`Team '${escapeMarkdown(attack.attackedTeam.name)}' has defended their region ` +
                `'${escapeMarkdown(attack.subregion.name)}' against an attack from team '${escapeMarkdown(attack.attackingTeam.name)}'`);
        }

        // Save battle challenges in both teams so that they aren't assigned the same battle challenge in another attack
        const completedBattleChallengesByAttackingTeam = await attack.attackingTeam.completedBattleChallenges;
        attack.attackingTeam.completedBattleChallenges = Promise.resolve([...completedBattleChallengesByAttackingTeam, attack.battleChallenge]);
        const completedBattleChallengesByAttackedTeam = await attack.attackedTeam.completedBattleChallenges;
        attack.attackedTeam.completedBattleChallenges = Promise.resolve([...completedBattleChallengesByAttackedTeam, attack.battleChallenge]);

        await this.entityManager.remove(attack);
        await this.entityManager.save([attack.subregion, attack.attackingTeam, attack.attackedTeam]);
    }
}