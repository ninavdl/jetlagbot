import { Markup } from 'telegraf';
import { message } from 'telegraf/filters';
import { CreateGame } from '../lifecycle/createGame';
import { CommandScene } from './command';

export class CreateGameScene extends CommandScene {
    getInitCommand(): string {
        return "createGame"
    }

    getDescription(): string {
        return "Create a new game"
    }

    setup() {
        this.enter(async (ctx) => {
            try {
                this.assertGroupChat(ctx)
            }
            catch(e) {
                await ctx.reply("Error: " + e.message);
                await ctx.scene.leave();
                return;
            }

            ctx.reply('Game name?', Markup.forceReply());
        });

        this.on(message('text'), async (ctx) => {
            try {
                await ctx.gameLifecycle.runAction(CreateGame, { name: ctx.update.message.text, telegramMainChatId: ctx.chat.id });
                return ctx.reply("Game created. You can add teams now.");
            }
            catch (e) {
                console.log(e);
                await ctx.reply("Error: " + e.message);
            }
            finally {
                await ctx.scene.leave();
            }
        });
    }
}
