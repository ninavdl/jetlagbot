import { Markup, Scenes } from 'telegraf';
import { JetlagContext } from '../context';
import { CheckGamePreconditions } from '../lifecycle/checkGamePreconditions';
import { StartGame } from '../lifecycle/startGame';
import { CommandScene } from './command';

export class StartGameScene extends CommandScene {
    getInitCommand(): string {
        return "start"
    }

    getDescription(): string {
        return "Start the game"
    }

    setup() {
        this.enter(async (ctx) => {
            try {
                await ctx.gameLifecycle.runAction(CheckGamePreconditions, null);

                await ctx.reply("Do you really want to start the game? It is not possible to modify teams, players, challenges afterwards.",
                    Markup.inlineKeyboard([
                        Markup.button.callback("Yes", "confirm"),
                        Markup.button.callback("No", "decline")
                    ]));
            } catch (e) {
                await ctx.reply("Error: " + e.message);
                await ctx.scene.leave();
            }
        });

        this.action("confirm", async (ctx) => {
            try {
                await ctx.editMessageReplyMarkup(null);
                await ctx.reply("Starting game. Challenges will be assigned");
                await ctx.gameLifecycle.runAction(StartGame, null);
            }
            catch (e) {
                await ctx.reply("Error: " + e.message);
                await ctx.scene.leave();
            }
        });

        this.action("decline", async (ctx) => {
            await ctx.editMessageReplyMarkup(null);
            await ctx.reply("Ok :(");
            await ctx.scene.leave();
        });
    }
}
