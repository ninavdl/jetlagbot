import { Column, Entity, JoinColumn, JoinTable, ManyToMany, ManyToOne, OneToOne, Relation } from "typeorm";
import { GameObject } from "./GameObject";
import { Subregion } from "./Subregion";
import { BattleChallenge } from "./BattleChallenge";
import { Team } from "./Team";

@Entity()
export class Attack extends GameObject {
    @OneToOne(() => Subregion, (subregion) => subregion.currentAttack)
    @JoinColumn()
    subregion: Relation<Subregion>;

    @OneToOne(() => Team, (team) => team.currentlyAttacking)
    @JoinColumn()
    attackingTeam: Relation<Team>;

    @OneToOne(() => Team, (team) => team.currentlyAttacked)
    @JoinColumn()
    attackedTeam: Relation<Team>;

    @ManyToOne(() => BattleChallenge, (battleChallenge) => battleChallenge.currentlyUsed)
    battleChallenge: Relation<BattleChallenge>
}