import { GameLifecycleAction } from "./lifecycle";
import { Challenge } from "../models/Challenge";
import { Team } from "../models/Team";
import { CheckGamePreconditions } from "./checkGamePreconditions";
import { Equal } from "typeorm";

export class StartGame extends GameLifecycleAction<void, void> {
    public async run() {
        // Even though this is checked before in the StartGameScene, it could be possible that
        // the data was modified between sending /startGame and confirming the start.
        await this.callSubAction(CheckGamePreconditions, null);

        let challengeRepository = this.entityManager.getRepository(Challenge);
        let teamsRepository = this.entityManager.getRepository(Team);

        let [allChallenges, teams] = await Promise.all([
            challengeRepository.findBy({ game: Equal(this.game.uuid) }),
            teamsRepository.findBy({ game: Equal(this.game.uuid) })
        ]);

        let allChallengesByUuid = Object.fromEntries(allChallenges.map(challenge => [challenge.uuid, challenge]));

        allChallenges.forEach(challenge => {
            challenge.teams = [];
        });

        teams.forEach(team => {
            let challengeUuids: string[] = [];
            while (challengeUuids.length < this.game.numberOfChallengesPerTeam) {
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
    }
}