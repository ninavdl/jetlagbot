import { Column, Entity, ManyToMany, ManyToOne, Relation } from "typeorm";
import { GameObject } from "./GameObject";
import { Game } from "./Game";
import { Attack } from "./Attack";
import { escapeMarkdown } from "../util";

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

    @Column()
    timeInMinutes: number;

    public toMarkdown(): string {
        return `**${escapeMarkdown(this.name)}** \\(${this.timeInMinutes} minutes\\)\n` +
               `_${escapeMarkdown(this.description)}_\n` 
    }
}