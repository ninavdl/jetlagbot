import { Markup, Scenes } from 'telegraf';
import { JetlagContext } from '../../context';
import { Team } from '../../models/Team';
import { ListTeams } from '../../lifecycle/helper/listTeams';
import { JoinTeam } from '../../lifecycle/init/joinTeam';
import { Player } from '../../models/Player';
import { CommandScene } from '../command';
import { ListPlayers } from '../../lifecycle/init/listPlayers';
import { escapeMarkdown } from '../../util';

export class ListPlayersScene extends CommandScene {
    getInitCommand(): string {
        return "listPlayers"
    }

    getDescription(): string {
        return "List all registered players"
    }

    setup() {
        this.enter(async (ctx) => {
            const players: Player[] = await ctx.gameLifecycle.runAction(ListPlayers, null);

            await ctx.reply("The following players are registered:\n"+ 
                players.map(ListPlayersScene.formatPlayer));
            
            return ctx.scene.leave();
        });
    }

    static formatPlayer(player: Player): string {
        let result = [`${escapeMarkdown(player.name)}`]
        
        if (player.team != null) {
            result.push(`✅ Team: ${escapeMarkdown(player.team.name)}`);
        } else {
            result.push("⚠️ No team");
        }

        if (player.telegramChatId != null) {
            result.push("✅ Initiated");
        } else {
            result.push("⚠️ Not initiated");
        }

        return `- ${result.join("|")}`;
    }
}
