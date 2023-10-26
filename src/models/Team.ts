import { Entity, Column, OneToMany, ManyToOne, ManyToMany, Relation, JoinTable, EntityManager, OneToOne } from "typeorm";
import { Game } from "./Game";
import { Subregion } from "./Subregion";
import { Player } from "./Player";
import { GameObject } from "./GameObject";
import { Challenge } from "./Challenge";
import { Attack } from "./Attack";
import { CurseAssignment } from "./CurseAssignment";


@Entity()
export class Team extends GameObject {
    @ManyToOne(() => Game, (game) => game.teams)
    game: Relation<Game>;

    @Column()
    name: string;

    @OneToMany(() => Player, (player) => player.team)
    players: Relation<Player>[];

    @ManyToMany(() => Challenge, (challenge) => challenge.teams)
    @JoinTable()
    challengesOnHand: Relation<Challenge[]>;

    @ManyToMany(() => Challenge, (challenge) => challenge.completedByTeams)
    @JoinTable()
    completedChallenges: Promise<Challenge[]>;

    @ManyToOne(() => CurseAssignment, curseAssignment => curseAssignment.ownerTeam)
    cursesOnHand: Relation<CurseAssignment>[];

    @ManyToOne(() => CurseAssignment, curseAssignment => curseAssignment.cursedTeam)
    cursed: Relation<CurseAssignment>[];

    @Column()
    stars: number = 0;

    @OneToMany(() => Subregion, (subregion) => subregion.team)
    claimedSubregions: Relation<Subregion>[];

    @OneToOne(() => Attack, (attack) => attack.attackingTeam)
    currentlyAttacking: Relation<Attack>;

    @OneToOne(() => Attack, (attack) => attack.attackedTeam)
    currentlyAttacked: Relation<Attack>

    public static async replaceAllChallengesOnHand(entityManager: EntityManager, teamUuid: string, challengeUuids: string[]) {
        await entityManager.query("DELETE FROM team_challenges_on_hand_challenge WHERE teamUuid = $1", [teamUuid]);
        for (let challengeUuid of challengeUuids) {
            await entityManager.query("INSERT INTO team_challenges_on_hand_challenge (teamUuid, challengeUuid) VALUES ($1, $2);",
            [teamUuid, challengeUuid]);
        }
    }

    constructor(name: string) {
        super();
        this.name = name;
    }
}
