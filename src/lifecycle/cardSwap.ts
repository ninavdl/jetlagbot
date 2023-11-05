import { Equal } from "typeorm";
import { Player } from "../models/Player";
import { Team } from "../models/Team";
import { User } from "../user";
import { GameError, GameLifecycleAction } from "./lifecycle";
import { SupplyPlayer } from "./supplyPlayer";
import { ListTeamChallenges } from "./listTeamChallenges";
import { Challenge } from "../models/Challenge";

export type CardSwapArgs = { user: User, teamUuid: string, ownChallengeUuids: string[], otherChallengeUuids: string[] }

export class CardSwap extends GameLifecycleAction<Challenge[], CardSwapArgs> {
    public async run() {
        const player: Player = await this.callSubAction(SupplyPlayer, { user: this.args.user, withTeam: true });

        const teamRepository = this.entityManager.getRepository(Team);

        const otherTeam: Team = await teamRepository.findOne({
            where: {
                uuid: Equal(this.args.teamUuid),
                game: Equal(this.game.uuid)
            },
            relations: {
                challengesOnHand: true,
                players: true
            }
        });

        if (otherTeam == null) {
            throw new GameError("No such team");
        }

        const currentOtherChallengeUuids = otherTeam.challengesOnHand.map(c => c.uuid)
        for (let challengeUuid of this.args.otherChallengeUuids) {
            if (!currentOtherChallengeUuids.includes(challengeUuid)) {
                throw new GameError("Challenge is not on hand of other team!");
            }
        }

        const ownChallenges: Challenge[] = await this.callSubAction(ListTeamChallenges, { user: this.args.user });

        const currentOwnChallengeUuids = ownChallenges.map(c => c.uuid);
        for (let challengeUuid of this.args.ownChallengeUuids) {
            if (!currentOwnChallengeUuids.includes(challengeUuid)) {
                throw new GameError("Challenge is not on own hand");
            }
        }

        player.team.challengesOnHand = [
            ...ownChallenges.filter(c => !this.args.ownChallengeUuids.includes(c.uuid)),
            ...otherTeam.challengesOnHand.filter(c => this.args.otherChallengeUuids.includes(c.uuid))
        ];

        if(new Set(player.team.challengesOnHand.map(c => c.uuid)).size != this.game.numberOfChallengesPerTeam) {
            throw new GameError(`Card swap would result in your team having an invalid number of challenges on your hand`);
        }

        const challengesStolenFromOtherTeam = otherTeam.challengesOnHand.filter(c => this.args.otherChallengeUuids.includes(c.uuid));
        const challengesGivenToOtherTeam = ownChallenges.filter(c => this.args.ownChallengeUuids.includes(c.uuid));

        otherTeam.challengesOnHand = [
            ...otherTeam.challengesOnHand.filter(c => !this.args.otherChallengeUuids.includes(c.uuid)),
            ...ownChallenges.filter(c => this.args.ownChallengeUuids.includes(c.uuid))
        ];

        if(new Set(otherTeam.challengesOnHand.map(c => c.uuid)).size != this.game.numberOfChallengesPerTeam) {
            throw new GameError("Card swap would result in the other team having an invalid number of challenges on your hand");
        }

        await this.entityManager.save(player.team);
        await this.entityManager.save(otherTeam);

        await this.notifier.notifyTeam(otherTeam,
            `*Team '${player.team.name}' has stolen your cards\\!*\n` +
            `They took the following cards:\n\n`
            + challengesStolenFromOtherTeam.map(c => c.toMarkdown()).join("\n\n") + "\n\n" +
            `\nIn return, they have given you the following cards:\n\n` +
            challengesGivenToOtherTeam.map(c => c.toMarkdown()).join("\n\n")
        )

        return player.team.challengesOnHand;
    }
}