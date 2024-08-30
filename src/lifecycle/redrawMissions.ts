import { Equal, In } from "typeorm";
import { Mission } from "../models/Misssion";
import { Player } from "../models/Player";
import { Team } from "../models/Team";
import { User } from "../user";
import { chooseNRandom } from "../util";
import { GameError, GameLifecycleAction } from "./lifecycle";
import { SupplyPlayer } from "./supplyPlayer";
import { message } from "telegraf/filters";

export class RedrawMissionsArgs {
    user: User;
    starsToDeduct: number;
}

export class RedrawMissions extends GameLifecycleAction<void, RedrawMissionsArgs> {
    async run() {
        const player: Player = await this.callSubAction(SupplyPlayer, {user: this.args.user, withTeam: true});
        
        const teamRepository = this.entityManager.getRepository(Team);
        const team = await teamRepository.findOne({
            where: {
                uuid: Equal(player.team.uuid)
            },
            relations: ["missionsOnHand", "players"]
        });

        if (team.stars < this.args.starsToDeduct) {
            throw new GameError("Not enough stars");
        }

        const [availableHardMissions, availableNonHardMissions] = await Promise.all([
            Mission.findUuidsNotCompletedAndNotOnHandOfTeam(
                this.entityManager, player.team.uuid, this.game.uuid, true
            ),
            Mission.findUuidsNotCompletedAndNotOnHandOfTeam(
                this.entityManager, player.team.uuid, this.game.uuid, false
            )
        ]);

        if (availableHardMissions.length < this.game.numberOfHardMissionsPerTeam) {
            throw new GameError("Not enough hard missions available");
        }

        if (availableNonHardMissions.length < this.game.numberOfNonHardMissionsPerTeam) {
            throw new GameError("Not enough non-hard missions available");
        }

        const newHardMissionUuids = chooseNRandom(availableHardMissions, this.game.numberOfHardMissionsPerTeam);
        const newNonHardMissionUuids = chooseNRandom(availableNonHardMissions, this.game.numberOfNonHardMissionsPerTeam);

        const missionRepository = this.entityManager.getRepository(Mission);

        const newMissions = await missionRepository.findBy({
            uuid: In([...newHardMissionUuids, ...newNonHardMissionUuids])
        });

        team.stars -= this.args.starsToDeduct;

        await teamRepository.save(team);
        await Team.replaceAllMissionssOnHand(this.entityManager, team.uuid, [...newHardMissionUuids, ...newNonHardMissionUuids])

        await this.notifier.notifyTeam(team, `Your new missions are:\n\n` + 
            newMissions.map(mission => mission.toMarkdown()).join("\n\n")
        );
    }
}