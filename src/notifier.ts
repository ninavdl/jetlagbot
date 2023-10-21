import { Telegraf } from "telegraf";
import { EntityManager, In } from "typeorm";
import { Game } from "./models/Game";
import { Player } from "./models/Player";
import { Team } from "./models/Team";
import { GameError } from "./lifecycle/lifecycle";

export class Notifier {
    constructor(
        private telegraf: Telegraf,
        private game: Game,
        private entityManager: EntityManager
    ) {}

    async notifyPlayersById(playerUuids: string[], message: string) {
        let players: Player[] = await this.entityManager.getRepository(Player).findBy({
            uuid: In(playerUuids)
        });

        await this.notifyPlayers(players, message);
    }

    async notifyPlayers(players: Player[], message: string) {
        players.forEach(async (player) => {
            await this.telegraf.telegram.sendMessage(player.telegramChatId, message, {parse_mode: "MarkdownV2"});
        });
    }

    async notifyTeamById(teamUuid: string, message: string) {
        let team = this.entityManager.getRepository(Team).find({
            where: {
                uuid: teamUuid
            },
            relations: ["players"]
        });

        if(team == null) {
            throw new GameError("No such team");
        }
    }

    async notifyTeam(team: Team, message: string) {
        await this.notifyPlayers(team.players, message);
    }

    async notifyGroup(message: string) {
        await this.telegraf.telegram.sendMessage(this.game.mainTelegramChatId, message, {parse_mode: "MarkdownV2"});
    }
}