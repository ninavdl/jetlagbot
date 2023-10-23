import { Entity, Column, ManyToOne, Relation, OneToOne } from "typeorm";
import { Region } from "./Region";
import { Team } from "./Team";
import { GameObject } from "./GameObject";
import { Attack } from "./Attack";


@Entity()
export class Subregion extends GameObject {
    @ManyToOne(() => Region, (region) => region.subregions)
    region: Relation<Region>;

    @Column()
    name: string;

    @ManyToOne(() => Team, (team) => team.claimedSubregions)
    team: Relation<Team>;

    @OneToOne(() => Attack, (attack) => attack.subregion, {nullable: true})
    currentAttack: Relation<Attack> = null

    @Column()
    areaInSquareKilometers: number;
}
