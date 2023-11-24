import { Entity, Column, ManyToOne, Relation, OneToOne } from "typeorm";
import { Region } from "./Region";
import { Team } from "./Team";
import { GameObject } from "./GameObject";
import { Attack } from "./Attack";

// postgres driver returns decimal numbers as string
// convert those strings to number type
// https://github.com/typeorm/typeorm/issues/873#issuecomment-424643086
class ColumnNumericTransformer {
    to(data: number): number {
      return data;
    }
    from(data: string): number {
      return parseFloat(data);
    }
  }

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

    @Column({default: 0, type: "decimal", precision: 8, scale: 2, transformer: new ColumnNumericTransformer()})
    areaInSquareKilometers: number = 0;

    @Column({default: false})
    attackLocked: boolean = false;
}
