import { GameLifecycleAction } from "./lifecycle";
import { GameError } from "./lifecycle";
import { Team } from "../models/Team";
import { User } from "../user";
import { SupplyPlayer } from "./supplyPlayer";
import { Player } from "../models/Player";
import { chooseRandom, escapeMarkdown } from "../util";
import { Mission, MissionDifficulty } from "../models/Misssion";
import { Equal } from "typeorm";

export type CompleteMissionArgs = { user: User, missionUuid: string }

export class CompleteMission extends GameLifecycleAction<void, CompleteMissionArgs>{
    public async run() {
        const teamRepository = this.entityManager.getRepository(Team);
        const missionRepository = this.entityManager.getRepository(Mission);

        // Get required entities
        const player: Player = await this.callSubAction(SupplyPlayer, { user: this.args.user, withTeam: true });
        const team = await this.entityManager.getRepository(Team).findOne({
            where: {
                uuid: Equal(player.team.uuid)
            },
            relations: ["missionsOnHand", "players"]
        });

        const mission = await missionRepository.findOne({
            where: { uuid: this.args.missionUuid },
            relations: ["teams"]
        });

        // Check preconditions for mission completion

        if (mission == null) {
            throw new GameError("Unknown mission");
        }

        if (!team.missionsOnHand.map(m => m.uuid).includes(mission.uuid)) {
            throw new GameError("Team does not hold mission");
        }

        // Update game sate

        const currentCompletedMissions = await team.completedMissions;
        team.completedMissions = Promise.resolve([...currentCompletedMissions, mission]);
        await teamRepository.save(team);

        let availableMissionUuids = await Mission.findUuidsNotCompletedAndNotOnHandOfTeam(this.entityManager, player.team.uuid, this.game.uuid,
            mission.difficulty == MissionDifficulty.HARD);

        let notifyTeamMessage: string;

        if (availableMissionUuids.length == 0) {
            await teamRepository.createQueryBuilder("team").relation(Team, "missionsOnHand")
                .of(team).remove({ uuid: mission.uuid });

            notifyTeamMessage = `There are no more new missions available`;
        } else {
            const newMissionUuid: string = chooseRandom(availableMissionUuids);
            const newMission = await this.entityManager.getRepository(Mission).findOneBy({ uuid: newMissionUuid });

            await teamRepository.createQueryBuilder("team").relation(Team, "missionsOnHand")
                .of(team)
                .addAndRemove({ uuid: newMissionUuid }, { uuid: mission.uuid });

            notifyTeamMessage = `Your new mission is:\n\n` +
                newMission.toMarkdown();
        }


        // Send messages

        await Promise.all([
            this.notifier.notifyGroup(`Team ${escapeMarkdown(team.name)} has finished a mission:\n\n` +
                mission.toMarkdown()),
            this.notifier.notifyTeam(team, notifyTeamMessage)]);

    }
}