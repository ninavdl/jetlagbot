import { CommandScene } from "./command";
import { InitPlayer } from "../lifecycle/initPlayer";

export class HelloScene extends CommandScene {
    public getInitCommand(): string {
        return "hello"
    }

    getDescription() {
        return "Initiates the sender as player"
    }

    public setup() {
        this.enter(async (ctx) => {
            if (ctx.chat.type != "private") {
                await ctx.reply("This command has to be executed in a private chat");
                return;
            }
            try {
                await ctx.gameLifecycle.runAction(InitPlayer,
                    {
                        user: ctx.user,
                        telegramChatId: ctx.message.chat.id
                    });
                await ctx.reply("Successfully initiated bot");
            }
            catch (e) {
                console.log(e);
                await ctx.reply("Error: " + e.message);
            }
            finally {
                await ctx.scene.leave();
            }
        })
    }
}