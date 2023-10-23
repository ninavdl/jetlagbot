import { Equal } from "typeorm";
import { Attack } from "../models/Attack";
import { Player } from "../models/Player";
import { Subregion } from "../models/Subregion";
import { User } from "../user";
import { GameError, GameLifecycleAction } from "./lifecycle";
import { SupplyPlayer } from "./supplyPlayer";

export type ListAttackableSubregionsArgs = {user: User}

export class ListAttackableSubregions extends GameLifecycleAction<Subregion[], ListAttackableSubregionsArgs> {
    public async run(): Promise<Subregion[]> {
        if(!this.game.running) {
            throw new GameError("Game is not running yet");
        }

        const player: Player = await this.callSubAction(SupplyPlayer, {user: this.args.user, withTeam: true});

        const currentAttack: Attack = await this.entityManager.getRepository(Attack)
            .findOne({
                where: [{
                    attackingTeam: Equal(player.team.uuid)
                }, {
                    attackedTeam: Equal(player.team.uuid)
                }]
            });

        if(currentAttack != null) {
            throw new GameError("You are already part of an attack.")
        }

        // find subregions that are 
        // - part of this game (i.e. part of a region that is part of this game)
        // - claimed, but not by this team
        // - not already being attacked
        return this.entityManager.getRepository(Subregion).createQueryBuilder("subregion")
            .innerJoin("subregion.region", "region")
            .innerJoinAndSelect("subregion.team", "claimedTeam")
            .leftJoin("subregion.currentAttack", "currentAttack")
            .where("region.gameUuid = :game_uuid", {game_uuid: this.game.uuid})
            .andWhere("claimedTeam.uuid != :team_uuid", {team_uuid: player.team.uuid})
            .andWhere("currentAttack.uuid is null")
            .getMany()
    }
}