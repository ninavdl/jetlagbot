import { Markup } from "telegraf";
import { JetlagContext } from "../context";
import { ListAttackableSubregions } from "../lifecycle/listAttackableSubregions";
import { Subregion } from "../models/Subregion";
import { CommandScene } from "./command";
import { v4 as uuid } from "uuid";
import { AssignBattleChallenge } from "../lifecycle/assignBattleChallenge";
import { Attack } from "../models/Attack";

export class StartAttackScene extends CommandScene {
    getInitCommand(): string {
        return "attack"
    }

    getDescription(): string {
        return "Initiate a battle challenge"
    }

    setup() {
        this.enter(async (ctx) => {
            try {
                this.assertPrivateChat(ctx);

                const attackableSubregions: Subregion[] = await ctx.gameLifecycle.runAction(ListAttackableSubregions, { user: ctx.user });
                if (attackableSubregions.length == 0) {
                    await ctx.reply("There is no subregion available for attack.");
                    return;
                }

                const cancelId = uuid();

                this.action(cancelId, async (ctx) => {
                    await ctx.editMessageReplyMarkup(null);
                    await ctx.scene.leave();
                })

                await ctx.reply("Which subregion do you want to attack?", Markup.inlineKeyboard(
                    [...attackableSubregions.map(subregion => {
                        const id = uuid();
                        this.action(id, async (ctx) => this.prepareBattleChallenge(ctx, subregion.uuid));
                        return Markup.button.callback(subregion.name + ` (${subregion.team.name})`, id);
                    }),
                    Markup.button.callback("Cancel", cancelId)],
                    { columns: 1 }
                ))
            }
            catch (e) {
                console.log(e);
                await ctx.reply("Error: " + e.message);
                await ctx.scene.leave();
            }
        })
    }

    async prepareBattleChallenge(ctx: JetlagContext, subregionUuid: string) {
        const id = uuid();

        await ctx.editMessageReplyMarkup(null);

        this.action(id + "confirm", async (ctx) => {
            this.assignBattleChallenge(ctx, subregionUuid)
        });

        this.action(id + "abort", async (ctx) => {
            await ctx.editMessageReplyMarkup(null);
            await ctx.reply("Aborted attack.");
            await ctx.scene.leave();
        })

        await ctx.replyWithMarkdownV2("**Please call the team you are attacking to get their attention**\n" +
            "Confirm that you called them to start the battle challenge", Markup.inlineKeyboard([
                Markup.button.callback("Confirm", id + "confirm"),
                Markup.button.callback("Abort", id + "abort")
            ]));
    }

    async assignBattleChallenge(ctx: JetlagContext, subregionUuid: string) {
        try {
            await ctx.editMessageReplyMarkup(null);
            await ctx.gameLifecycle.runAction(
                AssignBattleChallenge, { user: ctx.user, subregionUuid: subregionUuid });
            await ctx.reply("Attack started");
            // Notification of both teams is handled in action
        }
        catch (e) {
            console.log(e);
            await ctx.reply("Error: " + e.message);
        }
        finally {
            await ctx.scene.leave();
        }
    }
}