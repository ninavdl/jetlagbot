import { Column, Entity, EntityManager, ManyToMany, ManyToOne, Relation } from "typeorm";
import { GameObject } from "./GameObject";
import { Game } from "./Game";
import { Attack } from "./Attack";
import { escapeMarkdown } from "../util";
import { Team } from "./Team";

@Entity()
export class BattleChallenge extends GameObject {
    @Column()
    name: string;

    @Column()
    description: string;

    @ManyToOne(() => Game, (game) => game.allBattleChallenges)
    game: Relation<Game>;

    @ManyToMany(() => Attack, attack => attack.battleChallenge)
    currentlyUsed: Relation<Attack>[];

    @ManyToMany(() => Team, team => team.completedBattleChallenges)
    completedByTeams: Promise<Team>[];

    @Column()
    timeInMinutes: number;

    public toMarkdown(): string {
        return `**${escapeMarkdown(this.name)}** \\(${this.timeInMinutes} minutes\\)\n` +
               `_${escapeMarkdown(this.description)}_\n` 
    }

    public static async findUuidsNotCompletedByTeams(entityManager: EntityManager, team1Uuid: string, team2Uuid: string, gameUuid: string): Promise<string[]> {
        const result: {uuid: string}[] = await entityManager.query(`
            select uuid from battle_challenge where uuid not in (
                select battleChallengeUuid from team_completed_battle_challenges_battle_challenge where teamUuid = $1 or teamUuid = $2
            ) and gameUuid = $3
        `, [team1Uuid, team2Uuid, gameUuid]);

        return result.map(row => row.uuid);
    }
}