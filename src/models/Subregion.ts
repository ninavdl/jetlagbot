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

    @Column()
    id: string;

    @ManyToOne(() => Team, (team) => team.claimedSubregions)
    team: Relation<Team>;

    @OneToOne(() => Attack, (attack) => attack.subregion, {nullable: true})
    currentAttack: Relation<Attack> = null

    @Column({default: 0})
    areaInSquareKilometers: number = 0;

    @Column({default: false})
    attackLocked: boolean = false;
}
