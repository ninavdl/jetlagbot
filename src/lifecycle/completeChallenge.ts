import { GameLifecycleAction } from "./lifecycle";
import { GameError } from "./lifecycle";
import { Team } from "../models/Team";
import { Subregion } from "../models/Subregion";
import { Challenge } from "../models/Challenge";
import { In, Not, Equal } from "typeorm";

export type CompleteChallengeArgs = {teamUuid: string, challengeUuid: string, subregionUuids: string[]}

export class CompleteChallenge extends GameLifecycleAction<void, CompleteChallengeArgs>{
    public async run() {
        let subregionRepository = this.entityManager.getRepository(Subregion);
        let teamRepository = this.entityManager.getRepository(Team);
        let challengeRepository = this.entityManager.getRepository(Challenge);

        let team = await teamRepository.findOneBy({ uuid: this.args.teamUuid });
        if (team == null) {
            throw new GameError("Unknown team");
        }

        let challenge = await challengeRepository.findOne({
            where: { uuid: this.args.challengeUuid },
            relations: ["teams"]
        });

        if (challenge == null) {
            throw new GameError("Unknown challenge");
        }

        let subregions = await subregionRepository.find({
            where: { uuid: In(this.args.subregionUuids) },
            relations: ["team"]
        });

        if (subregions.length != this.args.subregionUuids.length) {
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
            game: Equal(this.game.uuid),
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

    }
}