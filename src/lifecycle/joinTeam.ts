import { GameLifecycleAction } from "./lifecycle";
import { SupplyPlayer } from "./supplyPlayer";
import { Team } from "../models/Team";
import { Player } from "../models/Player";
import { GameError } from "./lifecycle";
import { User } from "../user";

export type JoinTeamArgs = {user: User, teamUuid: string}

export class JoinTeam extends GameLifecycleAction<Player, JoinTeamArgs> {
    public async run(): Promise<Player> {
        let player: Player = await this.callSubAction(SupplyPlayer, {user: this.args.user});
        if(player == null) {
            throw new GameError("No such player");
        }

        let teamRepository = this.entityManager.getRepository(Team);
        let playerRepository = this.entityManager.getRepository(Player);

        let team = await teamRepository.findOne({
            where: { uuid: this.args.teamUuid },
            relations: ["players"]
        });
        if (team == null) {
            throw new GameError("No such team");
        }

        player.team = team;
        // Avoid adding a player to a team twice
        if (!team.players.some(teamPlayer => teamPlayer.uuid == player.uuid)) {
            team.players.push(player);
        }

        await Promise.all([
            playerRepository.save(player),
            teamRepository.save(team)
        ]);

        return player;
    }
}