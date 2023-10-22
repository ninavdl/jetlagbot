import { GameLifecycleAction } from "./lifecycle";
import { GameError } from "./lifecycle";
import { Team } from "../models/Team";
import { Subregion } from "../models/Subregion";
import { Challenge } from "../models/Challenge";
import { In, Not, Equal } from "typeorm";
import { User } from "../user";
import { SupplyPlayer } from "./supplyPlayer";
import { Player } from "../models/Player";
import { chooseRandom, escapeMarkdown } from "../util";

export type CompleteChallengeArgs = { user: User, challengeUuid: string, subregionUuids: string[] }

export class CompleteChallenge extends GameLifecycleAction<void, CompleteChallengeArgs>{
    public async run() {
        let subregionRepository = this.entityManager.getRepository(Subregion);
        let teamRepository = this.entityManager.getRepository(Team);
        let challengeRepository = this.entityManager.getRepository(Challenge);

        // Get required entities

        let player: Player = await this.callSubAction(SupplyPlayer, { user: this.args.user, withTeam: true });

        let team = player.team;

        let challenge = await challengeRepository.findOne({
            where: { uuid: this.args.challengeUuid },
            relations: ["teams"]
        });

        let subregions = await subregionRepository.find({
            where: { uuid: In(this.args.subregionUuids) },
            relations: ["team"]
        });

        // Check preconditions fo challenge completion

        if (challenge == null) {
            throw new GameError("Unknown challenge");
        }

        if (subregions.length != this.args.subregionUuids.length) {
            throw new GameError("Unknown subregions");
        }

        if (subregions.length != challenge.awardsSubregions) {
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

        // Update challenge and award team stars and subregions

        challenge.completed = true;
        team.stars += challenge.stars;

        subregions.forEach(subregion => {
            subregion.team = team;
        })

        await Promise.all([
            teamRepository.save(team),
            challengeRepository.save(challenge),
            subregionRepository.save(subregions)
        ]);

        let notifications: Promise<void>[] = [];

        notifications.push(this.notifier.notifyGroup(
            `Team ${team.name} has claimed new subregions: ${subregions.map(subregion => subregion.name).join(", ")}`
        ));

        // Unassign this challenge from all teams that have it on hand (including the team that completed it),
        // and reassign a new random uncompleted challenge to each team.

        let allUncompletedChallenges = await challengeRepository.findBy({
            game: Equal(this.game.uuid),
            completed: false,
            uuid: Not(challenge.uuid)
        });

        let updateQueries: Promise<void>[] = [];

        for (let challengeTeam of challenge.teams) {
            let teamChallengeUuids = (await challengeTeam.challengesOnHand).map(challenge => challenge.uuid);

            let uncompletedChallengesNotOnHand = allUncompletedChallenges.filter(challenge => !teamChallengeUuids.includes(challenge.uuid));
            let newChallenge = chooseRandom(uncompletedChallengesNotOnHand);

            updateQueries.push(teamRepository.createQueryBuilder("team")
                .relation(Team, "challengesOnHand")
                .of(challengeTeam)
                .addAndRemove({ uuid: newChallenge.uuid }, { uuid: challenge.uuid }));

            notifications.push(
                this.notifier.notifyTeamById(challengeTeam.uuid, escapeMarkdown(`
                        Another team has completed the challenge "${challenge.name}".\n
                        You can no longer complete this challenge and it has been removed from your hand.\n
                        It has been replaced by a new challenge:\n\n`) +
                    newChallenge.toMarkdown())
            )
        }

        await Promise.all(updateQueries);
        await Promise.all(notifications);
    }
}