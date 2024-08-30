import { Markup } from "telegraf"
import { JetlagContext } from "../../context"
import { ListTeams } from "../../lifecycle/listTeams"
import { Team } from "../../models/Team"
import { CommandScene } from "../command"
import { Mission } from "../../models/Misssion"
import { ListTeamMissions } from "../../lifecycle/listTeamMissions"

export class MissionPeekScene extends CommandScene<JetlagContext> {
    static starsToDeduct = 3;

    setup() {
        this.enter(this.handleErrors(async (ctx) => {
            const teams: Team[] = await ctx.gameLifecycle.runAction(ListTeams, { withPlayers: true });

            await ctx.reply("Which team's missions do you want to see?", Markup.inlineKeyboard([
                ...teams.filter(team => !team.players.map(player => player.telegramId).includes(ctx.user.telegramUserId))
                    .map(team => Markup.button.callback(team.name, `team-${team.uuid}`)),
                Markup.button.callback("Cancel", "cancel")
            ], { columns: 1 }));
        }));

        this.action(/^team-(.*)$/, this.handleErrors(async (ctx) => {
            await ctx.editMessageReplyMarkup(null);

            const teamMissions: Mission[] = await ctx.gameLifecycle.runAction(ListTeamMissions, {
                user: ctx.user,
                otherTeamUuid: ctx.match[1],
                deductStars: MissionPeekScene.starsToDeduct
            });

            await ctx.reply("The chosen team has the following missions on their hand:\n\n"
                + teamMissions.map(mission => mission.toMarkdown()).join("\n\n"), { parse_mode: "MarkdownV2" });

            await ctx.scene.leave();
        }));

        this.action("cancel", this.handleErrors(async (ctx) => {
            await ctx.editMessageReplyMarkup(null);
            await ctx.scene.leave();
        }));
    }
}