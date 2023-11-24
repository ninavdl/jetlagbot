import { Entity, Column, OneToMany, Relation } from "typeorm";
import { Challenge } from "./Challenge";
import { Team } from "./Team";
import { GameObject } from "./GameObject";
import { Player } from "./Player";
import { Region } from "./Region";
import { BattleChallenge } from "./BattleChallenge";
import { Curse } from "./Curse";


@Entity()
export class Game extends GameObject {
    @Column()
    name: string;

    @OneToMany(() => Team, (team) => team.game)
    teams: Relation<Team>[];

    @OneToMany(() => Player, (player) => player)
    players: Relation<Player>[];

    @Column()
    running: boolean = false;

    @Column()
    numberOfChallengesPerTeam: number = 5;

    @OneToMany(() => Challenge, (challenge) => challenge.game)
    allChallenges: Relation<Challenge>[];

    @OneToMany(() => Region, (region) => region.game)
    allRegions: Relation<Region>[];

    @OneToMany(() => BattleChallenge, (battleChallenge) => battleChallenge.game)
    allBattleChallenges: Relation<BattleChallenge>[];

    @OneToMany(() => Curse, (curse) => curse.game)
    allCurses: Relation<Curse>[];
    
    @Column({
        nullable: true
    })
    mainTelegramChatId: number;

    @Column({nullable: true, select: false})
    geoJson: string
}
