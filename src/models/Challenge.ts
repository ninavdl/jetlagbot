import { Entity, Column, ManyToOne, ManyToMany, Relation, EntityManager } from "typeorm";
import { Game } from "./Game";
import { GameObject } from "./GameObject";
import { Team } from "./Team";
import { escapeMarkdown } from "../util";


@Entity()
export class Challenge extends GameObject {
    @ManyToOne(() => Game, (game) => game.allChallenges)
    game: Relation<Game>;

    @ManyToMany(() => Team, (team) => team.challengesOnHand)
    teams: Relation<Team>[];

    @ManyToMany(() => Team, team => team.completedChallenges)
    completedByTeams: Relation<Team>[];

    @Column()
    name: string;

    @Column()
    description: string;

    @Column()
    stars: number;

    @Column()
    awardsSubregions: number;

    public static async findUuidsNotCompletedByTeam(entityManager: EntityManager, teamUuid: string, gameUuid: string): Promise<string[]> {
        const result: { uuid: string }[] = await
            entityManager.query(
                `SELECT uuid FROM challenge
            WHERE uuid NOT IN (
                SELECT challengeUuid FROM team_completed_challenges_challenge WHERE teamUuid = $1
            )
            AND gameUuid = $2;`, [teamUuid, gameUuid]);
        return result.map(obj => obj.uuid);
    }

    public static async findUuidsNotCompletedAndNotOnHandOfTeam(entityManager: EntityManager, teamUuid: string, gameUuid: string): Promise<string[]> {
        const result: { uuid: string }[] = await entityManager.query(
            `SELECT uuid FROM challenge
            WHERE uuid NOT IN (
                SELECT challengeUuid FROM team_challenges_on_hand_challenge WHERE teamUuid = $1
            )
            AND uuid NOT IN (
                SELECT challengeUuid FROM team_completed_challenges_challenge WHERE teamUuid = $1
            )
            AND gameUuid = $2;`, [teamUuid, gameUuid]);
        return result.map(obj => obj.uuid);
    }

    public toMarkdown(): string {
        return `*${escapeMarkdown(this.name)}* \\(${this.stars} ⭐, ${this.awardsSubregions} 🗺️\\):  \n_${escapeMarkdown(this.description)}_`
    }
}
