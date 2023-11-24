import { GameLifecycleAction } from "./lifecycle";
import { GameError } from "./lifecycle";
import { Team } from "../models/Team";
import { Subregion } from "../models/Subregion";
import { Challenge } from "../models/Challenge";
import { In, Not, Equal, LessThanOrEqual } from "typeorm";
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

        if (subregions.length > challenge.awardsSubregions) {
            throw new GameError("Invalid number of subregions, expected " + challenge.awardsSubregions);
        }

        subregions.forEach(subregion => {
            if (subregion.team != null) {
                throw new GameError("Subregion " + subregion.name + " was already claimed");
            }
        });

        // Update challenge and award team stars and subregions

        team.stars += challenge.stars;

        subregions.forEach(subregion => {
            subregion.team = team;
        })

        const currentCompleteChallenge = await team.completedChallenges;
        if (!currentCompleteChallenge.map(c => c.uuid).includes(challenge.uuid))
            team.completedChallenges = Promise.resolve([...currentCompleteChallenge, challenge]);

        await Promise.all([
            teamRepository.save(team),
            subregionRepository.save(subregions)
        ]);

        const availableChallengeUuids = await Challenge.findUuidsNotCompletedAndNotOnHandOfTeam(this.entityManager, player.team.uuid, this.game.uuid);

        const newChallengeUuid: string = chooseRandom(availableChallengeUuids);
        const newChallenge = await this.entityManager.getRepository(Challenge).findOneBy({ uuid: newChallengeUuid });

        await teamRepository.createQueryBuilder("team").relation(Team, "challengesOnHand")
            .of(team)
            .addAndRemove({ uuid: newChallengeUuid }, { uuid: challenge.uuid });


        await this.notifier.notifyGroup(
            `Team ${escapeMarkdown(team.name)} has claimed new subregions: _${subregions.map(subregion => escapeMarkdown(subregion.name)).join(", ")}_\\.\n` +
            `They completed the following challenge:\n\n${challenge.toMarkdown()}`
        );

        await this.notifier.notifyTeamById(player.team.uuid, `Your new challenge is:\n\n${newChallenge.toMarkdown()}`)
    }
}