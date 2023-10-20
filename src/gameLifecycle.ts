import {
    Game, Team, Player, Region, Subregion, Challenge
} from "./models";
import { DataSource, EntityManager, ILike, In, IsNull, Not } from "typeorm";

export class GameError extends Error {

}

type GameContext<ReturnType> = (game: Game, entityManager: EntityManager) => Promise<ReturnType>;

export class GameLifecycle {
    dataSource: DataSource;
    gameId: string;

    constructor() {
        this.dataSource = new DataSource({
            type: "sqlite",
            database: "./db.sqlite",
            entities: [Game, Team, Player, Region, Subregion, Challenge],
            logging: true,
            synchronize: true
        });

        this.dataSource.initialize();
    }

    async createGame(name: string) {
        let game = new Game();
        game.name = name;
        game.allChallenges = [];

        let challenges = [];
        for(let i = 0; i<20; i++) {
            let challenge = new Challenge();
            challenge.name = "Test Challenge " + i;
            challenge.description = "bla bla bla " + i;
            challenge.stars = Math.floor(Math.random() * 3);
            challenge.awardsSubregions = Math.floor(Math.random() * 2);
            challenge.game = game;
            game.allChallenges.push(challenge);
            challenges.push(challenge);
        }

        let regions = [
            new Region(), new Region()
        ];
        regions[0].game = game;
        regions[0].name = "Region 0",
        regions[0].subregions = [];
        regions[1].game = game;
        regions[1].name = "Region 1";
        regions[1].subregions = [];

        let subregions = [];
        for (let i = 0; i < 20; i++) {
            let subregion = new Subregion();
            subregion.name = "Subregion " + i;
            subregion.region = regions[i < 10 ? 0 : 1];
            subregion.region.subregions.push(subregion);
            subregions.push(subregion);
        }

        await this.dataSource.getRepository(Game).save(game);

        await this.dataSource.getRepository(Challenge).save(challenges);
        await this.dataSource.getRepository(Region).save(regions);
        await this.dataSource.getRepository(Subregion).save(subregions);


        this.gameId = game.uuid;
    }


    private async withGame<ReturnType>(context: GameContext<ReturnType>): Promise<ReturnType> {
        return await this.dataSource.transaction(async (entityManager) => {
            let gameRepository = entityManager.getRepository(Game);

            let game = await gameRepository.findOneBy({ uuid: this.gameId });
            if (game == null) {
                throw new GameError("Unknown game");
            }
            let returnValue = await context(game, entityManager);
            await gameRepository.save(game);

            return returnValue;
        })
    }

    async isGameStarted(): Promise<boolean> {
        return this.withGame(async (game, entityManager) => {
            return game.running;
        })
    }

    async createTeam(name: string): Promise<Team> {
        return this.withGame(async (game, entityManager) => {
            const teamsWithName = await entityManager.getRepository(Team).findOneBy({
                name: ILike(name)
            });

            if (teamsWithName != null) {
                throw new GameError("There is already a team of this name");
            }

            let team = new Team(name);
            team.game = game;

            entityManager.getRepository(Team).save(team);

            return team;
        })
    }

    async listTeams(): Promise<Team[]> {
        return this.withGame(async (game, entityManager) => {
            return entityManager.getRepository(Team).findBy({
                game: game
            })
        });
    }

    async initPlayerChatId(name: string, telegramId: number, telegramChatId: number) {
        return this.withGame(async (game, entityManager) => {
            const player = await this.getPlayerFromTelegramId(name, telegramChatId);
            
            player.telegramChatId = telegramChatId;

            entityManager.getRepository(Player).save(player);
        })
    }

    async getPlayersNotInitiated(): Promise<Player[]> {
        return this.withGame(async (game, entityManager) => {
            return entityManager.getRepository(Player).findBy({
                game: game,
                telegramChatId: IsNull()
            });
        })
    }

    async createPlayer(name: string, telegramId: number, teamUuid: string): Promise<Player> {
        return this.withGame(async (game, entityManager) => {
            let team = await entityManager.getRepository(Team).findOneBy({ uuid: teamUuid });

            if (team == null) {
                throw new GameError("No such team");
            }

            let player = new Player(name, telegramId);
            player.team = team;
            player.game = game;

            await Promise.all([
                entityManager.getRepository(Team).save(team),
                entityManager.getRepository(Player).save(player)
            ]);

            return player;
        })
    }

    async getPlayerFromTelegramId(name: string, telegramId: number): Promise<Player> {
        return this.withGame(async (game, entityManager) => {
            const playerRepo = entityManager.getRepository(Player);
            let player = await playerRepo.findOneBy({
                game: game,
                telegramId: telegramId
            });
            if(player == null) {
                player = new Player(name, telegramId);
                player.game = game;
                playerRepo.save(player);
            }
            return player;
        })
    }

    async assignPlayerToTeam(playerUuid: string, teamUuid: string) {
        await this.withGame(async (game, entityManager) => {
            let teamRepository = entityManager.getRepository(Team);
            let playerRepository = entityManager.getRepository(Player);

            let team = await teamRepository.findOne({
                where: { uuid: teamUuid },
                relations: ["players"]
            });
            if (team == null) {
                throw new GameError("No such team");
            }

            let player = await playerRepository.findOneBy({ uuid: playerUuid });
            if (player == null) {
                throw new GameError("No such player");
            }

            player.team = team;
            // Avoid adding a player to a team twice
            if (!team.players.some(teamPlayer => teamPlayer.uuid == player.uuid)) {
                team.players.push(player);
            }

            await Promise.all([
                playerRepository.save(player),
                teamRepository.save(team)
            ]);
        })
    }

    async getAllChallenges(): Promise<Challenge[]> {
        return await this.withGame(async(game, entityManager) => {
            return entityManager.getRepository(Challenge).findBy({game: game});
        })
    }

    async randomReassignAllChallenges() {
        await this.withGame(async (game, entityManager) => {
            let challengeRepository = entityManager.getRepository(Challenge);
            let teamsRepository = entityManager.getRepository(Team);

            let [allChallenges, teams] = await Promise.all([
                challengeRepository.findBy({ game: game }),
                teamsRepository.findBy({ game: game })
            ]);

            let allChallengesByUuid = Object.fromEntries(allChallenges.map(challenge => [challenge.uuid, challenge]));

            allChallenges.forEach(challenge => {
                challenge.teams = [];
            });

            teams.forEach(team => {
                let challengeUuids: string[] = [];
                while (challengeUuids.length < game.numberOfChallengesPerTeam) {
                    let random = Math.floor(Math.random() * allChallenges.length)
                    let challenge = allChallenges[random];
                    if (!(challengeUuids.includes(challenge.uuid))) {
                        challengeUuids.push(challenge.uuid);
                    }
                }
                team.challengesOnHand = challengeUuids.map(uuid => allChallengesByUuid[uuid]);
                team.challengesOnHand.forEach(challenge => {
                    challenge.teams.push(team);
                });
            })

            await challengeRepository.save(allChallenges);
            await teamsRepository.save(teams);
        })
    }

    async completeChallenge(teamUuid: string, challengeUuid: string, subregionUuids: string[]) {
        await this.withGame(async (game, entityManager) => {
            let subregionRepository = entityManager.getRepository(Subregion);
            let teamRepository = entityManager.getRepository(Team);
            let challengeRepository = entityManager.getRepository(Challenge);

            let team = await teamRepository.findOneBy({ uuid: teamUuid });
            if (team == null) {
                throw new GameError("Unknown team");
            }

            let challenge = await challengeRepository.findOne({
                where: { uuid: challengeUuid },
                relations: ["teams"]
            });

            if (challenge == null) {
                throw new GameError("Unknown challenge");
            }

            let subregions = await subregionRepository.find({
                where: { uuid: In(subregionUuids) },
                relations: ["team"]
            });

            if (subregions.length != subregionUuids.length) {
                throw new GameError("Unknown subregions");
            }

            if( subregions.length != challenge.awardsSubregions ) {
                throw new GameError("Invalid number of subregions, expected " + challenge.awardsSubregions);
            }

            if (challenge.completed) {
                throw new GameError("Challenge is already completed");
            }

            subregions.forEach(subregion => {
                if (subregion.team != null) {
                    throw new GameError("Subregion " + subregion.name + " was already claimed");
                }
            });

            
            challenge.completed = true;
            team.stars += challenge.stars;

            team.claimedSubregions.push(...subregions);
            subregions.forEach(subregion => {
                subregion.team = team;
            })

            // Get all challenges that are not completed
            let allChallenges = await challengeRepository.findBy({
                game: game,
                completed: false,
                uuid: Not(challenge.uuid)
            });

            challenge.teams.forEach(teamWithChallengeOnHand => {
                // Remove this challenge from all teams hands
                teamWithChallengeOnHand.challengesOnHand = teamWithChallengeOnHand.challengesOnHand.filter(challengeOnHand => challengeOnHand != challenge);
                
                while(true) {
                    let newChallenge = allChallenges[Math.floor(Math.random() * allChallenges.length)];
                    if( !teamWithChallengeOnHand.challengesOnHand.includes(challenge) ) {
                        teamWithChallengeOnHand.challengesOnHand.push(newChallenge);
                        newChallenge.teams.push(teamWithChallengeOnHand);

                        teamRepository.save(teamWithChallengeOnHand);
                        challengeRepository.save(newChallenge);

                        return;
                    }
                }
            })

            challenge.teams = [];

            await Promise.all([
                teamRepository.save(team),
                challengeRepository.save(challenge),
                ...subregions.map(subregion => subregionRepository.save(subregion))
            ]);
        })
    }
}