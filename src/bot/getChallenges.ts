import { ListTeamChallenges } from "../lifecycle/listTeamChallenges";
import { Challenge } from "../models/Challenge";
import { CommandScene } from "./command";

export class GetChallengesScene extends CommandScene {
    public getInitCommand(): string {
        return "getChallenges";
    }

    public getDescription(): string {
        return "List the current challenges of your team"
    }

    public setup() {
        this.enter(async (ctx) => {
            try {
                this.assertPrivateChat(ctx);

                const challenges: Challenge[] = await ctx.gameLifecycle.runAction(ListTeamChallenges, { user: ctx.user });

                await ctx.reply("Your current challenges are:\n\n"
                    + challenges.map(challenge => challenge.toMarkdown()).join("\n\n"), { parse_mode: "MarkdownV2" });

            }
            catch(e) {
                console.log(e);
                await ctx.reply("Error: " + e.message);
            }
            finally {
                await ctx.scene.leave();
            }
        })
    }
}