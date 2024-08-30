import { Markup } from "telegraf";
import { CommandScene } from "../command";
import { GetGame } from "../../lifecycle/helper/getGame";
import { Game } from "../../models/Game";

export class MapScene extends CommandScene {
    getInitCommand(): string {
        return "map"
    }

    getDescription(): string {
        return "Show a map with current claims"
    }

    setup() {
        this.enter(this.handleErrors(async (ctx) => {
            const game: Game = await ctx.gameLifecycle.runAction(GetGame, null);

            await ctx.reply("Map is available here", Markup.inlineKeyboard([
                Markup.button.url("Open map", ctx.config.publicUrl + "/map.html#gameUuid=" + game.uuid)
            ]))

            await ctx.scene.leave();
        }));
    }
}