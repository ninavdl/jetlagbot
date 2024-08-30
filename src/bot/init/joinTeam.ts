import { Markup, Scenes } from 'telegraf';
import { JetlagContext } from '../../context';
import { Team } from '../../models/Team';
import { ListTeams } from '../../lifecycle/helper/listTeams';
import { JoinTeam } from '../../lifecycle/init/joinTeam';
import { Player } from '../../models/Player';
import { CommandScene } from '../command';

export class JoinTeamScene extends CommandScene {
    getInitCommand(): string {
        return "joinTeam"
    }

    getDescription(): string {
        return "Join a team"
    }

    setup() {
        this.enter(async (ctx) => {
            const teams: Team[] = await ctx.gameLifecycle.runAction(ListTeams, { withPlayers: true });

            teams.forEach(team => {
                this.action(team.uuid, ctx => this.assign(team, ctx));
            });

            return ctx.reply("Select team", Markup.inlineKeyboard(teams.map(team => Markup.button.callback(team.name, team.uuid)
            ), { columns: 1 }));
        });

    }

    async assign(team: Team, ctx: JetlagContext): Promise<void> {
        let player: Player = await ctx.gameLifecycle.runAction(JoinTeam, {
            user: ctx.user,
            teamUuid: team.uuid
        });

        await ctx.reply("Assigned player '" + player.name + "' to team '" + team.name + "'");
        await ctx.editMessageReplyMarkup(null);
        await ctx.scene.leave();
    }
}
