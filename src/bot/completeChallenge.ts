import { Markup, Scenes } from "telegraf";
import { ListTeamChallenges } from "../lifecycle/listTeamChallenges";
import { CommandScene } from "./command";
import { Challenge } from "../models/Challenge";
import { JetlagContext } from "../context";
import { ListUnclaimedRegions } from "../lifecycle/listUnclaimedSubregions";
import { Subregion } from "../models/Subregion";
import { Region } from "../models/Region";
import { CompleteChallenge } from "../lifecycle/completeChallenge";
import { GetChallenge } from "../lifecycle/getChallenge";
import { sortByPropertyAlphabetical } from "../util";

interface CompleteChallengeSession extends Scenes.SceneSession {
    challengeUuid: string;
    numberOfSubregions: number;
    maxStars: number;
    selectedStars: number;
    currentSelectedRegionUuid: string;
    subregionUuids: string[]

    subregionsByRegionUuids: { [regionUuid: string]: Subregion[] }
}

interface CompleteChallengeContext extends JetlagContext {
    session: CompleteChallengeSession
}

export class CompleteChallengeScene extends CommandScene<CompleteChallengeContext> {
    public getInitCommand(): string {
        return "completeChallenge"
    }

    public getDescription(): string {
        return "Mark a challenge as completed"
    }

    public async setup() {
        this.enter(this.handleErrors(async (ctx) => {
            this.assertPrivateChat(ctx);

            ctx.session.numberOfSubregions = null;
            ctx.session.maxStars = null;
            ctx.session.selectedStars = null;
            ctx.session.subregionUuids = [];

            const teamChallenges: Challenge[] =
                await ctx.gameLifecycle.runAction(ListTeamChallenges, { user: ctx.user });


            await ctx.reply("Which challenge did you complete?", Markup.inlineKeyboard(
                [
                    ...sortByPropertyAlphabetical(teamChallenges, challenge => challenge.name).map(challenge => Markup.button.callback(challenge.name, `challenge-${challenge.uuid}`)),
                    Markup.button.callback("Cancel", "cancel")
                ],
                { columns: 1 }
            ));
        }));

        this.action("cancel", this.handleErrors(async (ctx) => {
            await ctx.editMessageReplyMarkup(null);
            await ctx.scene.leave();
        }));

        this.action(/^challenge-(.*)$/, this.handleErrors(async (ctx) => {
            ctx.session.challengeUuid = ctx.match[1];

            await ctx.editMessageReplyMarkup(null);
            await this.offerRegions(ctx);
        }));

        this.action(/^region-(.*)$/, this.handleErrors(async (ctx) => {
            ctx.session.currentSelectedRegionUuid = ctx.match[1];

            await ctx.editMessageReplyMarkup(null);
            await this.offerSubregions(ctx);
        }));

        this.action(/^subregion-(.*)$/, this.handleErrors(async (ctx) => {
            ctx.session.subregionUuids.push(ctx.match[1]);
            await ctx.editMessageReplyMarkup(null);

            await this.complete(ctx);
        }));

        this.action(/^stars-([0-9]+)$/, this.handleErrors(async (ctx) => {
            ctx.session.selectedStars = parseInt(ctx.match[1]);

            await ctx.editMessageReplyMarkup(null);

            await this.complete(ctx);
        }))

        this.action("forceComplete", this.handleErrors(async (ctx) => {
            await ctx.editMessageReplyMarkup(null);
            await ctx.reply(`Do you really only want to claim ${ctx.session.subregionUuids.length} subregions?`,
                Markup.inlineKeyboard([
                    Markup.button.callback("Yes", "forceCompleteConfirm"),
                    Markup.button.callback("Cancel", "cancel")
                ])
            );
        }));

        this.action("forceCompleteConfirm", this.handleErrors(async (ctx) => {
            await ctx.editMessageReplyMarkup(null);
            await this.complete(ctx, true);
        }));

    }

    public async offerRegions(ctx: CompleteChallengeContext) {
        const unclaimedSubregions: Subregion[] = await ctx.gameLifecycle.runAction(ListUnclaimedRegions, null);

        const regions: { [uuid: string]: Region } = {}
        const subregionsByRegion: { [uuid: string]: Subregion[] } = {}

        unclaimedSubregions.forEach(subregion => {
            if (subregion.region.uuid in subregionsByRegion) subregionsByRegion[subregion.region.uuid].push(subregion);
            else subregionsByRegion[subregion.region.uuid] = [subregion];
            if (subregion.region.uuid in regions) return;
            regions[subregion.region.uuid] = subregion.region;
        });

        ctx.session.subregionsByRegionUuids = subregionsByRegion;

        const regionButtons = sortByPropertyAlphabetical(Object.values(regions), region => region.name)
            .map(region => Markup.button.callback(region.name, `region-${region.uuid}`));

        if (ctx.session.subregionUuids.length < ctx.session.numberOfSubregions && ctx.session.subregionUuids.length != 0) {
            await ctx.reply("The selected challenge claims more than one subregion.\nIn which region is the next subregion you want to claim?",
                Markup.inlineKeyboard(
                    [
                        ...regionButtons,
                        Markup.button.callback(`Only claim ${ctx.session.subregionUuids.length} subregions`, "forceComplete"),
                        Markup.button.callback("Cancel", "cancel")
                    ],
                    { columns: 1 }));
        } else {
            await ctx.reply("In which region is the subregion you want to claim?", Markup.inlineKeyboard(
                [
                    ...regionButtons,
                    Markup.button.callback("Cancel", "cancel")
                ],
                { columns: 1 }
            ));
        }
    }

    public async offerSubregions(ctx: CompleteChallengeContext) {
        if (ctx.session.numberOfSubregions == null) {
            const challenge: Challenge = await ctx.gameLifecycle.runAction(GetChallenge, { uuid: ctx.session.challengeUuid });
            ctx.session.numberOfSubregions = challenge.awardsSubregions;
            ctx.session.maxStars = challenge.dynamicNumberOfStars ? challenge.stars : null;
        }

        const subregions = ctx.session.subregionsByRegionUuids[ctx.session.currentSelectedRegionUuid];

        await ctx.reply("Which subregion do you want to claim?", Markup.inlineKeyboard(
            [
                ...sortByPropertyAlphabetical(subregions.filter(subregion => !ctx.session.subregionUuids.includes(subregion.uuid)), subregion => subregion.name)
                    .map(subregion => Markup.button.callback(subregion.name, `subregion-${subregion.uuid}`)),
                Markup.button.callback("Cancel", "cancel")
            ],
            { columns: 1 }
        ))
    }

    public async offerStars(ctx: CompleteChallengeContext) {
        const buttons = [];
        for (let i = 0; i <= ctx.session.maxStars; i++) {
            buttons.push(
                Markup.button.callback(`${i} ⭐️`, `stars-${i}`)
            )
        }

        await ctx.reply("This rewards a dynamic number of stars. How many stars should you be awarded?",
            Markup.inlineKeyboard(buttons))
    }

    public async complete(ctx: CompleteChallengeContext, force: boolean = false) {
        if (ctx.session.subregionUuids.length == ctx.session.numberOfSubregions || force) {
            if (ctx.session.maxStars != null && ctx.session.selectedStars == null) {
                return await this.offerStars(ctx);
            }

            await ctx.gameLifecycle.runAction(CompleteChallenge, {
                user: ctx.user,
                challengeUuid: ctx.session.challengeUuid,
                subregionUuids: ctx.session.subregionUuids,
                selectedStars: ctx.session.selectedStars
            });

            await ctx.reply("Challenge marked as completed!");
            await ctx.scene.leave();
        } else {
            await this.offerRegions(ctx);
        }

    }
}