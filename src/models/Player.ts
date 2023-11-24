import { Entity, Column, ManyToOne, Relation } from "typeorm";
import { Game } from "./Game";
import { Team } from "./Team";
import { GameObject } from "./GameObject";


@Entity()
export class Player extends GameObject {
    @ManyToOne(() => Game, (game) => game.players)
    game: Relation<Game>;

    @ManyToOne(() => Team, (team) => team.players)
    team: Relation<Team>;

    @Column()
    name: string;

    @Column()
    telegramId: number;

    @Column({ nullable: true, type: "bigint" })
    telegramChatId: number = null;

    @Column({default: false})
    isAdmin: boolean = false;

    constructor(name: string, telegramId: number) {
        super();
        this.name = name;
        this.telegramId = telegramId;
    }
}
