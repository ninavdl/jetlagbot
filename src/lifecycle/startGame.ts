import { GameLifecycleAction } from "./lifecycle";
import { Challenge } from "../models/Challenge";
import { Team } from "../models/Team";
import { CheckGamePreconditions } from "./checkGamePreconditions";
import { Equal } from "typeorm";
import { Game } from "../models/Game";
import { chooseRandom } from "../util";

export class StartGame extends GameLifecycleAction<void, void> {
    public async run() {
        // Even though this is checked before in the StartGameScene, it could be possible that
        // the data was modified between sending /startGame and confirming the start.
        await this.callSubAction(CheckGamePreconditions, null);

        let challengeRepository = this.entityManager.getRepository(Challenge);
        let teamsRepository = this.entityManager.getRepository(Team);

        let [allChallenges, teams] = await Promise.all([
            challengeRepository.findBy({ game: Equal(this.game.uuid) }),
            teamsRepository.find({ where: { game: Equal(this.game.uuid) }, relations: ["players"] })
        ]);

        let allChallengesByUuid = Object.fromEntries(allChallenges.map(challenge => [challenge.uuid, challenge]));

        allChallenges.forEach(challenge => {
            challenge.teams = [];
        });

        let notifyPromises = []

        teams.forEach(team => {
            let challengeUuids: string[] = [];
            while (challengeUuids.length < this.game.numberOfChallengesPerTeam) {
                let challenge = chooseRandom(allChallenges);
                if (!(challengeUuids.includes(challenge.uuid))) {
                    challengeUuids.push(challenge.uuid);
                }
            }
            let challengesOnHand = challengeUuids.map(uuid => allChallengesByUuid[uuid]);
            team.challengesOnHand = challengesOnHand;
            challengesOnHand.forEach(challenge => {
                challenge.teams.push(team);
            });
            notifyPromises.push(this.notifier.notifyTeam(team, "Your team was assigned the folllowing challenges:\n\n"
                + challengesOnHand.map(challenge => challenge.toMarkdown()).join("\n\n")
            ))
        })

        this.game.running = true;
        await challengeRepository.save(allChallenges);
        await teamsRepository.save(teams);
        await this.entityManager.getRepository(Game).save(this.game);

        await Promise.all(notifyPromises);
    }
}