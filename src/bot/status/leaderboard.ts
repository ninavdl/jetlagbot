import { GetLeaderboard, LeaderboardEntry } from "../../lifecycle/helper/getLeaderboard";
import { escapeMarkdown } from "../../util";
import { CommandScene } from "../command";

const trophies = ["🥇", "🥈", "🥉"]

export class LeaderboardScene extends CommandScene {
    getInitCommand(): string {
        return "leaderboard";
    }

    getDescription(): string {
        return "Get the leaderboard for the current game";
    }

    setup() {
        this.enter(async (ctx) => {
            try {
                const leaderboard: LeaderboardEntry[] = await ctx.gameLifecycle.runAction(GetLeaderboard, null);

                const leaderboardFormatted = leaderboard.map((entry, i) =>
                    `${i < trophies.length ? trophies[i] : (i+1) + "\\."} *${escapeMarkdown(entry.name)}* \\(${entry.subregions}, ${entry.uniqueRegions}, ` + 
                    `${escapeMarkdown(entry.area.toString())}, ${entry.missionPoints}\\): ${entry.points} points`
                    ).join("\n");
                await ctx.reply(`The current leaderboard is:\n\n${leaderboardFormatted}\n\n` +
                `_\\(Subregions, Regions, Area, Missions\\)_`, { parse_mode: "MarkdownV2" });
            }
            catch(e) {
                console.log(e);
                await ctx.reply("Error: " + e.message);
            }
            finally {
                await ctx.scene.leave();
            }
        });
    }
}