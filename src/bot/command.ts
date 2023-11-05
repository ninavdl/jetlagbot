import { JetlagContext } from "../context";
import { Context, Scenes, Telegraf } from "telegraf";
import { GameError } from "../lifecycle/lifecycle";

export abstract class CommandScene<C extends JetlagContext = JetlagContext> extends Scenes.BaseScene<C> {
    sceneId: string;
    telegraf: Telegraf<JetlagContext>;

    getInitCommand(): string {
        return null
    };

    getDescription(): string {
        return null;
    }

    abstract setup();

    constructor(telegraf: Telegraf<JetlagContext>) {
        super(new.target.name)
        this.sceneId = new.target.name;
        this.telegraf = telegraf;
    }

    public init() {
        if (this.getInitCommand() != null) this.telegraf.command(this.getInitCommand().toLowerCase(), async (ctx) => ctx.scene.enter(this.sceneId));
        this.setup();
    }

    protected getPlayerName(telegramUser: any): string {
        if (telegramUser.username == null) {
            return telegramUser.first_name + " " + telegramUser.last_name;
        }
        return telegramUser.username;
    }

    protected assertPrivateChat(ctx: JetlagContext) {
        if (ctx.chat.type != "private") {
            throw new GameError("This command has to be executed in a private chat");
        }
    }

    protected assertGroupChat(ctx: JetlagContext) {
        if (ctx.chat.type != "group" && ctx.chat.type != "supergroup") {
            throw new GameError("This command has to be executed in a group");
        }
    }

    protected handleErrors<ArgType extends C>(action: (ctx: ArgType) => Promise<void>): (ctx: ArgType) => Promise<void> {
        return async (ctx: ArgType) => {
            try {
                await action(ctx);
            }
            catch(e) {
                console.log(e);
                await ctx.editMessageReplyMarkup(null);
                await ctx.reply("Error: " + e.message);
                await ctx.scene.leave();
            }
    
        }
    }
}