import { Entity, Column, ManyToOne, ManyToMany, Relation, EntityManager } from "typeorm";
import { Game } from "./Game";
import { GameObject } from "./GameObject";
import { Team } from "./Team";
import { escapeMarkdown } from "../util";

export enum MissionDifficulty {
    EASY = "EASY",
    MEDIUM = "MEDIUM",
    HARD = "HARD"
}

export namespace MissionDifficulty {
    export function toMarkdown(difficulty: MissionDifficulty): String {
        switch (difficulty) {
            case MissionDifficulty.EASY:
                return "Easy";
            case MissionDifficulty.MEDIUM:
                return "Medium";
            case MissionDifficulty.HARD:
                return "Hard"
        }
    }

    export function getPoints(difficulty: MissionDifficulty): number {
        switch (difficulty) {
            case MissionDifficulty.EASY:
                return 2;
            case MissionDifficulty.MEDIUM:
                return 3;
            case MissionDifficulty.HARD:
                return 5;
        }
    }
}

@Entity()
export class Mission extends GameObject {
    @ManyToOne(() => Game, (game) => game.allMissions)
    game: Relation<Game>;

    @ManyToMany(() => Team, (team) => team.missionsOnHand)
    teams: Relation<Team>[];

    @ManyToMany(() => Team, team => team.completedChallenges)
    completedByTeams: Relation<Team>[];

    @Column()
    name: string;

    @Column()
    description: string;

    @Column({
        type: "enum",
        enum: MissionDifficulty,
        default: MissionDifficulty.EASY
    })
    difficulty: MissionDifficulty;

    public static async findUuidsNotCompletedAndNotOnHandOfTeam(entityManager: EntityManager, teamUuid: string, gameUuid: string, hard: boolean): Promise<string[]> {
        const difficultyCondition = hard ? 
            "AND difficulty = 'HARD'" :
            "AND difficulty <> 'HARD'";
        const result: { uuid: string, difficulty: MissionDifficulty }[] = await entityManager.query(
            `SELECT uuid FROM mission
            WHERE uuid NOT IN (
                SELECT "missionUuid" FROM team_missions_on_hand_mission WHERE "teamUuid" = $1
            )
            AND uuid NOT IN (
                SELECT "missionUuid" FROM team_completed_missions_mission WHERE "teamUuid" = $1
            )
            ${difficultyCondition}
            AND "gameUuid" = $2;`, [teamUuid, gameUuid]);
        return result.map(obj => obj.uuid);
    }

    public toMarkdown(): string {
        return `*${escapeMarkdown(this.name)}* \\(${MissionDifficulty.toMarkdown(this.difficulty)}\\):  \n_${escapeMarkdown(this.description)}_`
    }
}
