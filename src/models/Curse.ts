import { Column, Entity, ManyToOne, OneToMany, Relation } from "typeorm";
import { GameObject } from "./GameObject";
import { Game } from "./Game";
import { CurseAssignment } from "./CurseAssignment";
import { escapeMarkdown } from "../util";

@Entity()
export class Curse extends GameObject {
    @Column()
    name: string;

    @ManyToOne(() => Game, game => game.allCurses)
    game: Relation<Game>;

    @Column()
    description: string;

    @OneToMany(() => CurseAssignment, curseAssignment => curseAssignment.curse)
    assignments: Relation<CurseAssignment>[]; 

    public toMarkdown(): string {
        return `**${escapeMarkdown(this.name)}**:\n_${escapeMarkdown(this.description)}_`
    }
}