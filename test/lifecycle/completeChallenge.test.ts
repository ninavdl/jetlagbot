import { EntityManager, Equal } from "typeorm";
import { CompleteChallenge } from "../../src/lifecycle/completeChallenge";
import { Challenge } from "../../src/models/Challenge";
import { Game } from "../../src/models/Game";
import { Player } from "../../src/models/Player";
import { Team } from "../../src/models/Team";
import { LifecycleTestHelper } from "./lifecycleTestHelper";
import { Region } from "../../src/models/Region";
import { Subregion } from "../../src/models/Subregion";
import { GameError } from "../../src/lifecycle/lifecycle";

async function setupGame(entityManager: EntityManager, team1Challenges: number[], team2Challenges: number[]): Promise<Game> {
    const game = new Game()
    game.name = "Test game";
    game.running = true;
    game.numberOfChallengesPerTeam = 3;

    const team1 = new Team("Team 1");
    team1.game = game;
    const team2 = new Team("Team 2");
    team2.game = game;

    game.teams = [team1, team2];

    const player1 = new Player("Player 1", 1);
    const player2 = new Player("Player 2", 2);

    player1.team = team1;
    player1.game = game;
    player2.team = team2;
    player2.game = game;

    team1.players = [player1];
    team2.players = [player2];

    const challenges: Challenge[] = [];
    for (let i = 0; i < 10; i++) {
        const challenge = new Challenge();
        challenge.awardsSubregions = 1;
        challenge.completed = false;
        challenge.name = "Challenge " + i;
        challenge.description = "Challenge " + i;
        challenge.stars = 1;
        challenge.game = game;

        challenges.push(challenge);

        challenge.teams = [];

        if (team1Challenges.includes(i)) challenge.teams.push(team1);
        if (team2Challenges.includes(i)) challenge.teams.push(team2);
    }

    game.allChallenges = challenges;


    const region1 = new Region()
    region1.name = "Region 1";
    region1.game = game;
    region1.subregions = [];

    const region2 = new Region();
    region2.name = "Region 2";
    region2.game = game;
    region2.subregions = [];

    const regions = [region1, region2];
    game.allRegions = regions;

    const subregions = [];
    for (let i = 0; i < 10; i++) {
        let subregion = new Subregion();
        subregion.name = "Subregion " + i;
        subregion.region = i < 5 ? region1 : region2;
        subregion.region.subregions.push(subregion);
        subregions.push(subregion);
    }

    await entityManager.save([
        game,
        team1,
        team2,
        player1,
        player2,
        ...challenges,
        ...regions,
        ...subregions
    ]);

    return game;
}

describe("Complete challenges", () => {

    beforeAll(async () => {
        await LifecycleTestHelper.setup();
    })
    
    afterAll(() => {
        //LifecycleTestHelper.teardown();
    });
    
    // setup challenges

    let initialGame;
    let firstCompletedChallenge;
    let firstClaimedSubregion;

    test("Complete one challenge", async () => {
        await LifecycleTestHelper.dataSource.transaction(async (entityManager) => {
            // Given
            let game = await setupGame(entityManager, [0, 1, 2], [2, 3, 4]);
            initialGame = game;

            LifecycleTestHelper.lifecycle.gameId = game.uuid;

            const completedChallengeUuid = game.allChallenges[2].uuid;
            const claimedSubregionUuid = game.allRegions[0].subregions[0].uuid;
            const notCompletedButAssignedChallengesUuids = Object.fromEntries(game.allChallenges.filter(challenge => challenge.uuid != completedChallengeUuid && challenge.teams.length != 0)
                .map(challenge => [challenge.uuid, challenge.teams.map(team => team.uuid)]));
            const claimingTeamUuid = game.teams[0].uuid;
            firstCompletedChallenge = completedChallengeUuid;
            firstClaimedSubregion = claimedSubregionUuid;

            // When

            await LifecycleTestHelper.lifecycle.runAction(CompleteChallenge, {
                user: { displayName: "Player 1", telegramUserId: 1 },
                challengeUuid: completedChallengeUuid,
                subregionUuids: [claimedSubregionUuid]
            });

            // Expect

            const challenges = await entityManager.getRepository(Challenge)
                .find({ where: { game: Equal(game.uuid) }, relations: { teams: true } });
            const teams = await entityManager.getRepository(Team)
                .find({where: {game: Equal(game.uuid)}, relations:{ challengesOnHand: true, claimedSubregions: true }});

            const teamsByUuid = Object.fromEntries(teams.map(team => [team.uuid, team]));
            let challengesByUuid = Object.fromEntries(challenges.map(challenge => [challenge.uuid, challenge]));

            expect(challenges.length).toBe(10);

            // Completed challenge is marked as completed and not assigned to any team
            expect(challengesByUuid[completedChallengeUuid].completed).toBe(true);
            expect(challengesByUuid[completedChallengeUuid].teams.length).toBe(0);

            // Not completed challenges that were assigned to a team previously are still not marked as completed
            // and still assigned to the same teams
            for(let [uuid, teamUuids] of Object.entries(notCompletedButAssignedChallengesUuids)) {
                expect(challengesByUuid[uuid].completed).toBe(false);
                for(let teamUuid of teamUuids) {
                    expect(challengesByUuid[uuid].teams.map(team => team.uuid)).toContain(teamUuid);
                }
            }

            // all teams still have three challenges assigned
            expect(teams.length).toBe(2);
            for(let team of teams) {
                let teamChallenges = await team.challengesOnHand;
                expect(teamChallenges.length).toBe(3);
                for(let challenge of teamChallenges) {
                    expect(challenge.completed).toBe(false);
                }
            }

            for( let team of teams) {
                if(team.uuid == claimingTeamUuid) {
                    expect(team.claimedSubregions.map(subregion => subregion.uuid)).toEqual([claimedSubregionUuid]);
                    expect(team.stars).toBe(1);
                }
                else {
                    expect(team.claimedSubregions).toEqual([]);
                    expect(team.stars).toBe(0);
                }
            }
        })
    });

    test("Claiming challenge again throws error", async () => {
        const completedChallengeUuid = initialGame.allChallenges[2].uuid;
        const claimedSubregionUuid = initialGame.allRegions[0].subregions[1].uuid;

        await expect(async () => {
            await LifecycleTestHelper.lifecycle.runAction(CompleteChallenge, {
                user: { displayName: "Player 1", telegramUserId: 1 },
                challengeUuid: completedChallengeUuid,
                subregionUuids: [claimedSubregionUuid]
            });
        }).rejects.toThrow(GameError);
    });

    test("Claiming subregion again throws error", async () => {
        const completedChallengeUuid = initialGame.allChallenges[3].uuid;
        const claimedSubregionUuid = initialGame.allRegions[0].subregions[0].uuid;

        await expect(async () => {
            await LifecycleTestHelper.lifecycle.runAction(CompleteChallenge, {
                user: { displayName: "Player 1", telegramUserId: 1 },
                challengeUuid: completedChallengeUuid,
                subregionUuids: [claimedSubregionUuid]
            });
        }).rejects.toThrow(GameError);
    })

    test("Complete another challenge", async () => {
        await LifecycleTestHelper.dataSource.transaction(async (entityManager) => {
            const completedChallengeUuid = initialGame.allChallenges[3].uuid;
            const claimedSubregionUuid = initialGame.allRegions[0].subregions[1].uuid;
            const claimingTeamUuid = initialGame.teams[0].uuid;
            
            await LifecycleTestHelper.lifecycle.runAction(CompleteChallenge, {
                user: { displayName: "Player 1", telegramUserId: 1 },
                challengeUuid: completedChallengeUuid,
                subregionUuids: [claimedSubregionUuid]
            });


            const challenges = await entityManager.getRepository(Challenge)
                .find({ where: { game: Equal(initialGame.uuid) }, relations: { teams: true } });
            const teams = await entityManager.getRepository(Team)
                .find({where: {game: Equal(initialGame.uuid)}, relations:{ challengesOnHand: true, claimedSubregions: true }});

            const notCompletedButAssignedChallengesUuids = Object.fromEntries(
                initialGame.allChallenges.filter(challenge => challenge.uuid != completedChallengeUuid && challenge.uuid != firstCompletedChallenge && challenge.teams.length != 0)
                .map(challenge => [challenge.uuid, challenge.teams.map(team => team.uuid)]));

            const teamsByUuid = Object.fromEntries(teams.map(team => [team.uuid, team]));
            let challengesByUuid = Object.fromEntries(challenges.map(challenge => [challenge.uuid, challenge]));

            expect(challenges.length).toBe(10);

            // Completed challenges are marked as completed and not assigned to any team
            expect(challengesByUuid[completedChallengeUuid].completed).toBe(true);
            expect(challengesByUuid[completedChallengeUuid].teams.length).toBe(0);
            expect(challengesByUuid[firstCompletedChallenge].completed).toBe(true);
            expect(challengesByUuid[firstCompletedChallenge].teams.length).toBe(0);

            // Not completed challenges that were assigned to a team previously are still not marked as completed
            // and still assigned to the same teams
            for(let [uuid, teamUuids] of Object.entries(notCompletedButAssignedChallengesUuids)) {
                expect(challengesByUuid[uuid].completed).toBe(false);
                for(let teamUuid of teamUuids) {
                    expect(challengesByUuid[uuid].teams.map(team => team.uuid)).toContain(teamUuid);
                }
            }

            // all teams still have three challenges assigned
            expect(teams.length).toBe(2);
            for(let team of teams) {
                let teamChallenges = await team.challengesOnHand;
                expect(teamChallenges.length).toBe(3);
                for(let challenge of teamChallenges) {
                    expect(challenge.completed).toBe(false);
                }
            }

            for( let team of teams) {
                if(team.uuid == claimingTeamUuid) {
                    expect(team.claimedSubregions.map(subregion => subregion.uuid).sort()).toEqual([claimedSubregionUuid, firstClaimedSubregion].sort());
                    expect(team.stars).toBe(2);
                }
                else {
                    expect(team.claimedSubregions).toEqual([]);
                    expect(team.stars).toBe(0);
                }
            }
        })
    })
});