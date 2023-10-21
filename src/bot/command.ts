import { JetlagContext } from "../context";
import { Scenes, Telegraf } from "telegraf";

export abstract class CommandScene extends Scenes.BaseScene<JetlagContext> {
    sceneId: string;
    telegraf: Telegraf<JetlagContext>;

    abstract getInitCommand(): string;
    abstract getDescription(): string;
    abstract setup();

    constructor(telegraf: Telegraf<JetlagContext>) {
        super(new.target.name)
        this.sceneId = new.target.name;
        this.telegraf = telegraf;
    }

    public init() {
        this.telegraf.command(this.getInitCommand().toLowerCase(), async (ctx) => ctx.scene.enter(this.sceneId));
        this.setup();
    }

    protected getPlayerName(telegramUser: any): string {
        if (telegramUser.username == null) {
            return telegramUser.first_name + " " + telegramUser.last_name;
        }
        return telegramUser.username;
    }

}