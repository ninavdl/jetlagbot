import { Markup, Scenes } from 'telegraf';
import { JetlagContext } from '../context';
import { Team } from '../models/Team';
import { ListTeams } from '../lifecycle/listTeams';
import { JoinTeam } from '../lifecycle/joinTeam';
import { Player } from '../models/Player';
import { CommandScene } from './command';

export class JoinTeamScene extends CommandScene {
    getInitCommand(): string {
        return "joinTeam"
    }

    getDescription(): string {
        return "Join a team"
    }

    setup() {
        this.enter(async (ctx) => {
            const teams: Team[] = await ctx.gameLifecycle.runAction(ListTeams, null);

            teams.forEach(team => {
                this.action(team.uuid, ctx => this.assign(team, ctx));
            });

            return ctx.reply("Select team", Markup.inlineKeyboard(teams.map(team => Markup.button.callback(team.name, team.uuid)
            )));
        });

    }

    async assign(team: Team, ctx: JetlagContext): Promise<void> {
        let player: Player = await ctx.gameLifecycle.runAction(JoinTeam, {
            name: this.getPlayerName(ctx.callbackQuery.from),
            telegramUserId: ctx.callbackQuery.from.id,
            teamUuid: team.uuid
        });

        await ctx.reply("Assigned player '" + player.name + "' to team '" + team.name + "'");
        await ctx.editMessageReplyMarkup(null);
        await ctx.scene.leave();
    }
}
