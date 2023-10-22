import { GetTeamStatus, TeamStatus } from "../lifecycle/teamStatus";
import { CommandScene } from "./command";

export class GetTeamStatusScene extends CommandScene {
    public getInitCommand(): string {
        return "teamStatus";
    }

    public getDescription(): string {
        return "Get your current stars and subregion count"
    }

    public setup() {
        this.enter(async (ctx) => {
            try {
                this.assertPrivateChat(ctx);

                const status: TeamStatus = await ctx.gameLifecycle.runAction(GetTeamStatus, { user: ctx.user });

                await ctx.reply(`Current stars: ${status.stars}\nCurrent subregions: ${status.subregions}`);
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