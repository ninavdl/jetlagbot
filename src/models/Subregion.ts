import { Entity, Column, ManyToOne, Relation } from "typeorm";
import { Region } from "./Region";
import { Team } from "./Team";
import { GameObject } from "./GameObject";


@Entity()
export class Subregion extends GameObject {
    @ManyToOne(() => Region, (region) => region.subregions)
    region: Relation<Region>;

    @Column()
    name: string;

    @ManyToOne(() => Team, (team) => team.claimedSubregions)
    team: Relation<Team>;
}
