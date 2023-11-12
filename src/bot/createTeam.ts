import { Markup, Scenes } from 'telegraf';
import { JetlagContext } from '../context';
import { message } from 'telegraf/filters';
import { CreateTeam } from '../lifecycle/createTeam';
import { Team } from '../models/Team';
import { CommandScene } from './command';
import { v4 as uuid } from "uuid";

export class CreateTeamScene extends CommandScene {
    getInitCommand(): string {
        return "createTeam";
    }

    getDescription(): string {
        return "Creates a new team"
    }

    setup() {
        this.enter(async (ctx) => {
            try {
                this.assertGameNotRunning(ctx);

                const cancelUuid = uuid();

                this.action(cancelUuid, async (ctx) => {
                    await ctx.editMessageReplyMarkup(null);
                    await ctx.scene.leave();
                })

                await ctx.reply("Creating team", Markup.inlineKeyboard([
                    Markup.button.callback("Cancel", cancelUuid)
                ]));

                await ctx.reply("Team name?", Markup.forceReply());
            }
            catch (e) {
                console.log(e);
                await ctx.reply("Error " + e.message);
                await ctx.scene.leave();
            }
        });

        this.on(message("text"), async (ctx) => {
            try {
                const team: Team = await ctx.gameLifecycle.runAction(CreateTeam, { name: ctx.update.message.text });
                return ctx.reply("Team '" + team.name + "' created.");
            }
            catch (e) {
                console.log(e);
                await ctx.reply("Error: " + e.message);
            }
            finally {
                ctx.scene.leave();
            }
        });
    }
}
