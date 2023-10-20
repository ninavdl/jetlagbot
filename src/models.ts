import { Entity, Column, PrimaryGeneratedColumn, OneToMany, ManyToOne, ManyToMany, JoinColumn, Relation, JoinTable } from "typeorm"

class GameObject {
    @PrimaryGeneratedColumn("uuid")
    uuid: string;
}

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
    numberOfChallengesPerTeam: number = 6;

    @OneToMany(() => Challenge, (challenge) => challenge.game)
    allChallenges: Relation<Challenge>[];

    @OneToMany(() => Region, (region) => region.game)
    allRegions: Relation<Region>[];
}

@Entity()
export class Region extends GameObject {
    @ManyToOne(() => Game, (game) => game.allRegions)
    game: Relation<Game>;

    @Column()
    name: string;
    
    @OneToMany(() => Subregion, (subregion) => subregion.region)
    subregions: Relation<Subregion>[];
}

@Entity()
export class Subregion extends GameObject {
    @ManyToOne(() => Region, (region) => region.subregions)
    region: Relation<Region>;

    @Column()
    name: string;

    @ManyToOne(() => Team, (team) => team.claimedSubregions)
    team: Relation<Team>;
}

@Entity()
export class Player extends GameObject {
    @ManyToOne(() => Game, (game) => game.players)
    game: Relation<Game>;

    @ManyToOne(() => Team, (team) => team.players)
    team: Relation<Team>;

    @Column()
    name: string;

    @Column()
    telegramId: number;

    @Column({nullable: true})
    telegramChatId: number = null;


    constructor(name: string, telegramId: number) {
        super();
        this.name = name;
        this.telegramId = telegramId;
    }
}

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
    challengesOnHand: Challenge[];

    @Column()
    stars: number = 0;

    @OneToMany(() => Subregion, (subregion) => subregion.team)
    claimedSubregions: Relation<Subregion>[];

    constructor(name: string) {
        super();
        this.name = name;
    }
}

@Entity()
export class Challenge extends GameObject {
    @ManyToOne(() => Game, (game) => game.allChallenges)
    game: Relation<Game>;

    @ManyToMany(() => Team, (team) => team.challengesOnHand)
    teams: Relation<Team>[];

    @Column()
    name: string;

    @Column()
    description: string;

    @Column()
    stars: number;

    @Column()
    awardsSubregions: number;

    @Column()
    completed: boolean = false;
}