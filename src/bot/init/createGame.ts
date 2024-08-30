import { Markup } from 'telegraf';
import { message } from 'telegraf/filters';
import { CreateGame } from '../../lifecycle/init/createGame';
import { CommandScene } from '../command';
import { v4 as uuid } from "uuid";
import { CheckAdmin } from '../../lifecycle/helper/checkAdmin';

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

                if (!(await ctx.telegram.getChatAdministrators(ctx.chat.id)).map(member => member.user.id).includes(ctx.user.telegramUserId)) {
                    await ctx.reply("User must be group admin");
                    await ctx.scene.leave();
                    return;

                }

            }
            catch (e) {
                await ctx.reply("Error: " + e.message);
                await ctx.scene.leave();
                return;
            }

            const cancelId = uuid();

            this.action(cancelId, async (ctx) => {
                await ctx.editMessageReplyMarkup(null);
                await ctx.scene.leave();
            });

            await ctx.reply('Creating game', Markup.inlineKeyboard(
                [Markup.button.callback("Cancel", cancelId)]
            ));

            await ctx.reply('Game name?', Markup.forceReply());
        });

        this.on(message('text'), async (ctx) => {
            try {
                const admins = await ctx.telegram.getChatAdministrators(ctx.chat.id);

                await ctx.gameLifecycle.runAction(CreateGame, {
                    name: ctx.update.message.text, telegramMainChatId: ctx.chat.id,
                    adminTelegramUserIds: admins.map(member => member.user.id)
                });

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
