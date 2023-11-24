import { Telegraf } from "telegraf";
import { EntityManager, In } from "typeorm";
import { Game } from "./models/Game";
import { Player } from "./models/Player";
import { Team } from "./models/Team";
import { GameError } from "./lifecycle/lifecycle";


export class Notifier {
    static scheduledMessages: Promise<void>[] = [];

    constructor(
        private game: Game,
        private entityManager: EntityManager,
        private telegraf?: Telegraf,
    ) {}

    async notifyPlayersById(playerUuids: string[], message: string) {
        let players: Player[] = await this.entityManager.getRepository(Player).findBy({
            uuid: In(playerUuids)
        });

        await this.notifyPlayers(players, message);
    }

    async notifyPlayers(players: Player[], message: string) {
        if(this.telegraf == null) return;
        players.forEach(async (player) => {
            await this.telegraf.telegram.sendMessage(player.telegramChatId, message, {parse_mode: "MarkdownV2", disable_web_page_preview: true})
        });
    }

    async notifyTeamById(teamUuid: string, message: string) {
        let team = await this.entityManager.getRepository(Team).findOne({
            where: {
                uuid: teamUuid
            },
            relations: ["players"]
        });

        if(team == null) {
            throw new GameError("No such team");
        }

        await this.notifyPlayers(team.players, message);
    }

    async notifyTeam(team: Team, message: string) {
        await this.notifyPlayers(team.players, message);
    }

    async notifyGroup(message: string) {
        await this.telegraf.telegram.sendMessage(this.game.mainTelegramChatId, message, {parse_mode: "MarkdownV2", disable_web_page_preview: true});
    }
}