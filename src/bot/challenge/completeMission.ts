import { Markup, Scenes } from "telegraf";
import { ListTeamChallenges } from "../../lifecycle/challenge/listTeamChallenges";
import { CommandScene } from "../command";
import { Challenge } from "../../models/Challenge";
import { JetlagContext } from "../../context";
import { ListUnclaimedRegions } from "../../lifecycle/helper/listUnclaimedSubregions";
import { Subregion } from "../../models/Subregion";
import { Region } from "../../models/Region";
import { CompleteChallenge } from "../../lifecycle/challenge/completeChallenge";
import { GetChallenge } from "../../lifecycle/challenge/getChallenge";
import { sortByPropertyAlphabetical } from "../../util";
import { ListTeamMissions } from "../../lifecycle/challenge/listTeamMissions";
import { Mission } from "../../models/Misssion";
import { CompleteMission } from "../../lifecycle/challenge/completeMission";

interface CompleteMissionSession extends Scenes.SceneSession {
    missionUuid: string;
}

interface CompleteMissionContext extends JetlagContext {
    session: CompleteMissionSession
}

export class CompleteMissionScene extends CommandScene<CompleteMissionContext> {
    public getInitCommand(): string {
        return "completeMission"
    }

    public getDescription(): string {
        return "Mark a mission as completed"
    }

    public async setup() {
        this.enter(this.handleErrors(async (ctx) => {
            this.assertPrivateChat(ctx);
            const teamMissions: Mission[] =
                await ctx.gameLifecycle.runAction(ListTeamMissions, { user: ctx.user });


            await ctx.reply("Which mission did you complete?", Markup.inlineKeyboard(
                [
                    ...teamMissions.map(mission => Markup.button.callback(mission.name, `mission-${mission.uuid}`)),
                    Markup.button.callback("Cancel", "cancel")
                ],
                { columns: 1 }
            ));
        }));

        this.action("cancel", this.handleErrors(async (ctx) => {
            await ctx.editMessageReplyMarkup(null);
            await ctx.scene.leave();
        }));

        this.action(/^mission-(.*)$/, this.handleErrors(async (ctx) => {
            ctx.session.missionUuid = ctx.match[1];
            await ctx.editMessageReplyMarkup(null);
            await this.complete(ctx);
        }));
    }

    public async complete(ctx: CompleteMissionContext) {
        await ctx.gameLifecycle.runAction(CompleteMission, { user: ctx.user, missionUuid: ctx.session.missionUuid });
        await ctx.reply("Mission marked as completed!");
        await ctx.scene.leave();
    }
}