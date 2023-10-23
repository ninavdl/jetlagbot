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
            const entry: LeaderboardEntry = {
                name: team.name,
                subregions: team.claimedSubregions.length,
                uniqueRegions: new Set(team.claimedSubregions.flatMap(subregion => subregion.region)).size,
                area: team.claimedSubregions.reduce((area, subregion) => area + subregion.areaInSquareKilometers, 0),
                points: 0
            };

            entry.points = entry.subregions * this.game.pointsPerSubregion
                + entry.uniqueRegions * this.game.pointsPerRegion;

            return entry
        });

        leaderboard.sort((a, b) => b.area - a.area)[0].points += this.game.areaBonus;

        return leaderboard.sort((a, b) => b.points - a.points);
    }

}