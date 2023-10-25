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

    @Column()
    completed: boolean = false;

    public static async findNotCompletedByTeam(entityManager: EntityManager, teamUuid: string, gameUuid: string): Promise<Challenge[]> {
        const queryBuilder = entityManager.createQueryBuilder();
        return entityManager.getRepository(Challenge).createQueryBuilder("challenge")
            .where("gameUuid = :game_uuid", { game_uuid: gameUuid })
            .andWhere(`uuid not in ${queryBuilder.subQuery().select("completeChallenge.uuid")
                .from(Team, "team")
                .leftJoin("team.completedChallenges", "completeChallenge")
                .where("team.uuid = :team_uuid", { team_uuid: teamUuid })
                .getQuery()
                }`)
            .getMany();
    }

    public static async findNotCompletedAndNotOnHandOfTeam(entityManager: EntityManager, teamUuid: string, gameUuid: string): Promise<Challenge[]> {
        const queryBuilder = entityManager.createQueryBuilder();
        return entityManager.getRepository(Challenge).createQueryBuilder("challenge")
            .where("gameUuid = :game_uuid", { game_uuid: gameUuid })
            .andWhere(`uuid not in ${queryBuilder.subQuery().select("completeChallenge.uuid")
                .from(Team, "team")
                .leftJoin("team.completedChallenges", "completeChallenge")
                .where("team.uuid = :team_uuid", { team_uuid: teamUuid })
                .getQuery()
                }`)
            .andWhere(`uuid not in ${queryBuilder.subQuery().select("onHandChallenge.uuid")
                .from(Team, "team")
                .leftJoin("team.challengesOnHand", "onHandChallenge")
                .where("team.uuid = :team_uuid", { team_uuid: teamUuid })
                .getQuery()
                }`)
            .getMany();

    }

    public toMarkdown(): string {
        return `**${escapeMarkdown(this.name)}** \\(${this.stars} ⭐, ${this.awardsSubregions} 🗺️\\):  \n_${escapeMarkdown(this.description)}_`
    }
}
