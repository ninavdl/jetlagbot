import { Markup } from "telegraf";
import { ListCursesOnHand } from "../lifecycle/listCursesOnHand";
import { Curse } from "../models/Curse";
import { CommandScene } from "./command";
import { v4 as uuid } from "uuid";
import { JetlagContext } from "../context";
import { ListTeamChallenges } from "../lifecycle/listTeamChallenges";
import { ListTeams } from "../lifecycle/listTeams";
import { Team } from "../models/Team";
import { ThrowCurse } from "../lifecycle/throwCurse";
import { CurseAssignment } from "../models/CurseAssignment";

export class CurseScene extends CommandScene {
    getInitCommand(): string {
        return "curse"
    }

    getDescription(): string {
        return "Throw a curse on another team"
    }

    async setup() {
        this.enter(async (ctx) => {
            try {
                this.assertPrivateChat(ctx);

                const curses: Curse[] = await ctx.gameLifecycle.runAction(ListCursesOnHand, { user: ctx.user });

                if (curses.length == 0) {
                    await ctx.reply("You currently don't have any curses on your hand. You can buy one using /powerup.");
                    await ctx.scene.leave();
                    return;
                }

                const cancelId = uuid();

                this.action(cancelId, async (ctx) => {
                    await ctx.editMessageReplyMarkup(null);
                    await ctx.scene.leave()
                });

                await ctx.replyWithMarkdownV2("Which curse do you want to throw? The following curses are available:\n\n" +
                    curses.map(curse => curse.toMarkdown()).join("\n"), Markup.inlineKeyboard(
                        [...curses.map(curse => {
                            const id = uuid();

                            this.action(id, async (ctx) => {
                                this.selectCurse(ctx, curse.uuid)
                            });

                            return Markup.button.callback(curse.name, id);
                        }),
                        Markup.button.callback("Cancel", cancelId)
                        ], { columns: 1 }
                    ));
            }
            catch (e) {
                console.log(e);
                await ctx.reply("Error: " + e.message);
                await ctx.scene.leave();
            }
        })
    }

    async selectCurse(ctx: JetlagContext, curseUuid: string) {
        try {
            await ctx.editMessageReplyMarkup(null);

            const teams: Team[] = await ctx.gameLifecycle.runAction(ListTeams, { withPlayers: true });

            const cancelId = uuid();

            this.action(cancelId, async (ctx) => {
                await ctx.editMessageReplyMarkup(null);
                await ctx.scene.leave()
            });

            await ctx.reply("Which team do you want to throw the curse on?", Markup.inlineKeyboard([
                ...teams.filter(team => !team.players.map(player => player.telegramId).includes(ctx.user.telegramUserId)).map(team => {
                    const id = uuid();
                    this.action(id, async (ctx) => this.throwCurse(ctx, curseUuid, team.uuid));
                    return Markup.button.callback(team.name, id);
                }),
                Markup.button.callback("Cancel", cancelId)
            ], { columns: 1 })
            );
        }
        catch (e) {
            console.log(e);
            await ctx.reply("Error: " + e.message);
            await ctx.scene.leave();
        }
    }

    async throwCurse(ctx: JetlagContext, curseUuid: string, teamUuid: string) {
        try {
            await ctx.editMessageReplyMarkup(null);

            const assignment: CurseAssignment = await ctx.gameLifecycle.runAction(ThrowCurse, { user: ctx.user, teamUuid: teamUuid, curseUuid: curseUuid });

            await ctx.reply(`You have cursed team '${assignment.cursedTeam.name}' with curse '${assignment.curse.name}'`, { parse_mode: "MarkdownV2" });
        }
        catch (e) {
            console.log(e);
            await ctx.reply("Error: " + e.message)
        }
        finally {
            await ctx.scene.leave();
        }
    }
}