import { Equal } from "typeorm"
import { GameError, GameLifecycleAction } from "./lifecycle"
import { Team } from "../models/Team"

export type LeaderboardEntry = {
    name: string,
    subregions: number,
    uniqueRegions: number,
    area: number,
    points: number
};

export class GetLeaderboard extends GameLifecycleAction<LeaderboardEntry[], void> {
    public async run(): Promise<LeaderboardEntry[]> {
        if(!this.game.running) {
            throw new GameError("Game is not running yet");
        }

        const teams = await this.entityManager.createQueryBuilder(Team, "team")
            .leftJoinAndSelect("team.claimedSubregions", "subregion")
            .leftJoinAndSelect("subregion.region", "region")
            .where("team.gameUuid = :game_uuid", { "game_uuid": this.game.uuid })
            .getMany();

        const leaderboard = teams.map(team => {
            const area = team.claimedSubregions.reduce((area, subregion) => area + subregion.areaInSquareKilometers, 0);

            const entry: LeaderboardEntry = {
                name: team.name,
                subregions: team.claimedSubregions.length,
                uniqueRegions: new Set(team.claimedSubregions.flatMap(subregion => subregion.region.uuid)).size,
                area: Math.round(area * 100) / 100, // round to 2 decimal places
                points: 0
            };

            entry.points = entry.subregions
                + entry.uniqueRegions * 2
                + Math.floor(entry.area / 100);

            return entry
        });

        return leaderboard.sort((a, b) => b.points - a.points);
    }

}