import { GameError, GameLifecycleAction } from "./lifecycle";
import { Player } from "../models/Player";
import { IsNull, Equal } from "typeorm";
import { Challenge } from "../models/Challenge";

export class CheckGamePreconditions extends GameLifecycleAction<void, void> {
    public async run() {
        const playerRepo = this.entityManager.getRepository(Player);

        if(this.game.running) {
            throw new GameError("The game is already running");
        }

        let uninitiatedPlayers: Player[] = await playerRepo.findBy({
            game: Equal(this.game.uuid),
            telegramChatId: IsNull()
        });

        if(uninitiatedPlayers.length > 0) {
            throw new GameError("The following players are not initiated yet:\n" + 
            uninitiatedPlayers.map(player => player.name).join(", ") + ".\n" +
            "They must send the /hello command to this bot in a private chat.")
        }

        let unassignedPlayers: Player[] = await playerRepo.findBy({
            game: Equal(this.game.uuid),
            team: IsNull()
        });

        if(unassignedPlayers.length > 0) {
            throw new GameError("The following players are not part of a team yet:\n" + 
            uninitiatedPlayers.map(player => player.name).join(", ") + ".")
        }

        let challenges: Challenge[] = await this.entityManager.getRepository(Challenge).findBy({
            game: Equal(this.game.uuid)
        });

        if(challenges.length < this.game.numberOfChallengesPerTeam) {
            throw new GameError("There are not enough challenges (min " + this.game.numberOfChallengesPerTeam + " are required");
        }
    }
}