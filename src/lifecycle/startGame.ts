import { GameLifecycleAction } from "./lifecycle";
import { Challenge } from "../models/Challenge";
import { Team } from "../models/Team";
import { CheckGamePreconditions } from "./checkGamePreconditions";
import { Equal } from "typeorm";
import { Game } from "../models/Game";
import { chooseNRandom, chooseRandom } from "../util";
import { Mission, MissionDifficulty } from "../models/Misssion";

export class StartGame extends GameLifecycleAction<void, void> {
    public async run() {
        // Even though this is checked before in the StartGameScene, it could be possible that
        // the data was modified between sending /startGame and confirming the start.
        await this.callSubAction(CheckGamePreconditions, null);

        const challengeRepository = this.entityManager.getRepository(Challenge);
        const missionsRepository = this.entityManager.getRepository(Mission);
        const teamsRepository = this.entityManager.getRepository(Team);

        const [allChallenges, allMissions, teams] = await Promise.all([
            challengeRepository.findBy({ game: Equal(this.game.uuid) }),
            missionsRepository.findBy({ game: Equal(this.game.uuid) }),
            teamsRepository.find({ where: { game: Equal(this.game.uuid) }, relations: ["players"] })
        ]);

        allChallenges.forEach(challenge => {
            challenge.teams = [];
        });

        allMissions.forEach(mission => {
            mission.teams = [];
        });

        const allHardMissions = allMissions.filter(mission => mission.difficulty == MissionDifficulty.HARD);
        const allNonHardMissions = allMissions.filter(mission => mission.difficulty != MissionDifficulty.HARD);

        const notifyPromises = []

        teams.forEach(team => {
            this.assignTeamChallenges(team, allChallenges);
            this.assignTeamMissions(team, allHardMissions, allNonHardMissions);

            notifyPromises.push(this.notifier.notifyTeam(team, "Your team was assigned the folllowing **challenges**:\n\n"
                + team.challengesOnHand.map(challenge => challenge.toMarkdown()).join("\n\n")
            ));
            notifyPromises.push(this.notifier.notifyTeam(team, "Your team was assigned the following **missinos**:\n\n"
                + team.missionsOnHand.map(mission => mission.toMarkdown()).join("\n\n")))
        })

        this.game.running = true;
        await challengeRepository.save(allChallenges);
        await teamsRepository.save(teams);
        await this.entityManager.getRepository(Game).save(this.game);

        await Promise.all(notifyPromises);
    }

    private assignTeamChallenges(team: Team, allChallenges: Challenge[]): void {
        team.challengesOnHand = chooseNRandom(allChallenges, this.game.numberOfChallengesPerTeam);

        team.challengesOnHand.forEach(challenge => {
            challenge.teams.push(team);
        });
    }

    private assignTeamMissions(team: Team, allHardMissions: Mission[], allNonHardMissions: Mission[]): void {
        let hardChallenges = chooseNRandom(allHardMissions, this.game.numberOfHardMissionsPerTeam);
        let nonHardChallenges = chooseNRandom(allNonHardMissions, this.game.numberOfNonHardMissionsPerTeam);

        team.missionsOnHand = [...hardChallenges, ...nonHardChallenges];
        team.missionsOnHand.forEach(mission => {
            mission.teams.push(team)
        });
    }
}