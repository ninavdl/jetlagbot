import { Entity, Column, ManyToOne, ManyToMany, Relation } from "typeorm";
import { Game } from "./Game";
import { GameObject } from "./GameObject";
import { Team } from "./Team";


@Entity()
export class Challenge extends GameObject {
    @ManyToOne(() => Game, (game) => game.allChallenges)
    game: Relation<Game>;

    @ManyToMany(() => Team, (team) => team.challengesOnHand)
    teams: Relation<Team>[];

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
}
