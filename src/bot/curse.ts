import { Markup, Scenes } from "telegraf";
import { ListCursesOnHand } from "../lifecycle/listCursesOnHand";
import { Curse } from "../models/Curse";
import { CommandScene } from "./command";
import { JetlagContext } from "../context";
import { ListTeams } from "../lifecycle/listTeams";
import { Team } from "../models/Team";
import { ThrowCurse } from "../lifecycle/throwCurse";
import { CurseAssignment } from "../models/CurseAssignment";
import { escapeMarkdown } from "../util";

interface CurseSession extends Scenes.SceneSession {
    curseUuid: string;
    teamUuid: string;
}

interface CurseContext extends JetlagContext {
    session: CurseSession;
}

export class CurseScene extends CommandScene<CurseContext> {
    getInitCommand(): string {
        return "curse"
    }

    getDescription(): string {
        return "Throw a curse on another team"
    }

    async setup() {
        this.enter(this.handleErrors(async (ctx) => {
            this.assertPrivateChat(ctx);

            const curses: Curse[] = await ctx.gameLifecycle.runAction(ListCursesOnHand, { user: ctx.user });

            if (curses.length == 0) {
                await ctx.reply("You currently don't have any curses on your hand. You can buy one using /powerup.");
                await ctx.scene.leave();
                return;
            }

            await ctx.replyWithMarkdownV2("Which curse do you want to throw? The following curses are available:\n\n" +
                curses.map(curse => curse.toMarkdown()).join("\n"), Markup.inlineKeyboard(
                    [...curses.map(curse => Markup.button.callback(curse.name, `curse-${curse.uuid}`)),
                    Markup.button.callback("Cancel", "cancel")
                    ], { columns: 1 }
                ));
        }));

        this.action(/^curse-(.*)$/, this.handleErrors(async (ctx) => {
            await ctx.editMessageReplyMarkup(null);
            ctx.session.curseUuid = ctx.match[1];

            await this.selectTeam(ctx);
        }));

        this.action(/^team-(.*)$/, this.handleErrors(async (ctx) => {
            await ctx.editMessageReplyMarkup(null);
            ctx.session.teamUuid = ctx.match[1];

            await this.throwCurse(ctx);
        }));

        this.action("cancel", this.handleErrors(async (ctx) => {
            await ctx.editMessageReplyMarkup(null);
            await ctx.scene.leave();
        }));
    }

    async selectTeam(ctx: JetlagContext) {
        const teams: Team[] = await ctx.gameLifecycle.runAction(ListTeams, { withPlayers: true });

        await ctx.reply("Which team do you want to throw the curse on?", Markup.inlineKeyboard([
            ...teams.filter(team => !team.players.map(player => player.telegramId).includes(ctx.user.telegramUserId))
                .filter(team => team.curseImmunityUntil == null || team.curseImmunityUntil <= new Date()).map(team => Markup.button.callback(team.name, `team-${team.uuid}`)),
            Markup.button.callback("Cancel", "cancel")
        ], { columns: 1 })
        );
    }

    async throwCurse(ctx: CurseContext) {
        const assignment: CurseAssignment = await ctx.gameLifecycle.runAction(ThrowCurse, { user: ctx.user, teamUuid: ctx.session.teamUuid, curseUuid: ctx.session.curseUuid });

        await ctx.reply(`You have cursed team *${escapeMarkdown(assignment.cursedTeam.name)}* with curse *${escapeMarkdown(assignment.curse.name)}*`, { parse_mode: "MarkdownV2" });
    }
}