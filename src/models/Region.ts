import { Entity, Column, OneToMany, ManyToOne, Relation } from "typeorm";
import { Game } from "./Game";
import { GameObject } from "./GameObject";
import { Subregion } from "./Subregion";


@Entity()
export class Region extends GameObject {
    @ManyToOne(() => Game, (game) => game.allRegions)
    game: Relation<Game>;

    @Column()
    name: string;

    @OneToMany(() => Subregion, (subregion) => subregion.region)
    subregions: Relation<Subregion>[];
}
