import { Equal } from "typeorm";
import { Attack } from "../models/Attack";
import { GameError, GameLifecycle, GameLifecycleAction } from "./lifecycle";
import { Team } from "../models/Team";
import { escapeMarkdown } from "../util";

export type CompleteBattleChallengeArgs = {attackUuid: string, winningTeamUuid: string}

export class CompleteBattleChallenge extends GameLifecycleAction<void, CompleteBattleChallengeArgs> {
    public async run() {
        const attack: Attack = await this.entityManager.getRepository(Attack).findOne({
            where: {uuid: Equal(this.args.attackUuid)},
            relations: {attackedTeam: true, attackingTeam: true, subregion: true} 
        });

        if(attack == null) {
            throw new GameError("No such attack");
        }

        if(attack.attackedTeam.uuid != this.args.winningTeamUuid && attack.attackingTeam.uuid != this.args.winningTeamUuid) {
            throw new GameError("Team is not part of this attack");
        }
        
        if(this.args.winningTeamUuid == attack.attackingTeam.uuid) {
            attack.subregion.team = attack.attackingTeam;
            await this.entityManager.save(attack.subregion);
            await this.notifier.notifyGroup(`Team '${escapeMarkdown(attack.attackingTeam.name)}' has conquered subregion ` +
            `'${escapeMarkdown(attack.subregion.name)}' from team '${escapeMarkdown(attack.attackedTeam.name)}`);
        } else {
            await this.notifier.notifyGroup(`Team '${escapeMarkdown(attack.attackedTeam.name)}' has defended their region` +
            `'${escapeMarkdown(attack.subregion.name)}' against an attack from team '${escapeMarkdown(attack.attackingTeam.name)}'`);
        }

        await this.entityManager.remove(attack);
    }
}