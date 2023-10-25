import { Collection, Column, Entity, ManyToOne, OneToMany } from "typeorm";
import { GameObject } from "./GameObject";
import { Curse } from "./Curse";
import { Team } from "./Team";

@Entity()
export class CurseAssignment extends GameObject {
    @ManyToOne(() => Curse, curse => curse.assignments)
    curse: Curse;

    @ManyToOne(() => Team, team => team.cursesOnHand)
    ownerTeam: Team;

    @ManyToOne(() => Team, team => team.cursed, {nullable: true})
    cursedTeam: Team;

    @Column({nullable: true})
    cursedDate: Date;
}