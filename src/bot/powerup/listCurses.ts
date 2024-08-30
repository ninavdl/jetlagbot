import { Markup } from "telegraf";
import { ListActiveCurses } from "../../lifecycle/curse/listActiveCurses";
import { CurseAssignment } from "../../models/CurseAssignment";
import { CommandScene } from "../command";
import { v4 as uuid } from "uuid";
import { JetlagContext } from "../../context";
import { RemoveCurse } from "../../lifecycle/curse/removeCurse";

export class ListCursesScene extends CommandScene {
    getInitCommand(): string {
        return "listCurses"
    }

    getDescription(): string {
        return "Show the curses currently active for your team, and deactivate them"
    }

    setup() {
        this.enter(async (ctx) => {
            try {
                const assignments: CurseAssignment[] = await ctx.gameLifecycle.runAction(ListActiveCurses, { user: ctx.user });

                if (assignments.length == 0) {
                    await ctx.reply("You currently aren't cursed.");
                    await ctx.scene.leave();
                    return;
                }

                const cancelId = uuid();
                this.action(cancelId, async (ctx) => {
                    await ctx.editMessageReplyMarkup(null);
                    await ctx.scene.leave();
                });


                await ctx.replyWithMarkdownV2("You are currently cursed with the following curses:\n\n"
                    + assignments.map(assignment => assignment.curse.toMarkdown()).join("\n")
                    + "\n\nDo you want to mark one of them as finished?",
                    Markup.inlineKeyboard([...assignments.map(assignment => {
                        const id = uuid();

                        this.action(id, async (ctx) => {
                            await this.deativateCurse(ctx, assignment.uuid)
                        })

                        return Markup.button.callback(assignment.curse.name, id);
                    }),
                    Markup.button.callback("Canel", cancelId)], { columns: 1 })
                );
            }
            catch (e) {
                console.log(e);
                await ctx.reply("Error: " + e.message);
                await ctx.scene.leave();
            }
        });
    }

    async deativateCurse(ctx: JetlagContext, assignmentUuid: string) {
        try {
            await ctx.editMessageReplyMarkup(null);
            await ctx.gameLifecycle.runAction(RemoveCurse, {user: ctx.user, curseAssignmentUuid: assignmentUuid});
        }
        catch(e) {
            console.log(e);
            await ctx.reply("Error: " + e.message);
        }
        finally {
            await ctx.scene.leave();
        }
    }
}