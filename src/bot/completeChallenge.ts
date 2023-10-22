import { Markup } from "telegraf";
import { ListTeamChallenges } from "../lifecycle/listTeamChallenges";
import { CommandScene } from "./command";
import { Challenge } from "../models/Challenge";
import { JetlagContext } from "../context";
import { ListUnclaimedRegions } from "../lifecycle/listUnclaimedSubregions";
import { Subregion } from "../models/Subregion";
import { Region } from "../models/Region";
import { CompleteChallenge } from "../lifecycle/completeChallenge";
import { GetChallenge } from "../lifecycle/getChallenge";
import { v4 as uuid } from "uuid";

export class CompleteChallengeScene extends CommandScene {
    public getInitCommand(): string {
        return "completeChallenge"
    }

    public getDescription(): string {
        return "Mark a challenge as completed"
    }

    public async setup() {
        this.enter(async (ctx) => {
            try {
                await this.assertPrivateChat(ctx);

                const teamChallenges: Challenge[] = 
                await ctx.gameLifecycle.runAction(ListTeamChallenges, { user: ctx.user });

                teamChallenges.forEach(challenge => {
                })

                await ctx.reply("Which challenge did you complete?", Markup.inlineKeyboard(
                    teamChallenges.map(challenge => {
                        const id = uuid();
                        this.action(id, (ctx) => this.offerRegions(ctx, challenge.uuid, []))
                        return Markup.button.callback(challenge.name, id)
                    }),
                    { columns: 1 }
                ));
            }
            catch (e) {
                console.log(e);
                await ctx.reply("Error: " + e);
                await ctx.scene.leave();
            }
        })
    }

    public async offerRegions(ctx: JetlagContext, challengeUuid: string, alreadySelectedSubregions: string[]) {
        await ctx.editMessageReplyMarkup(null);
        const unclaimedSubregions: Subregion[] = await ctx.gameLifecycle.runAction(ListUnclaimedRegions, null);

        const regions: { [uuid: string]: Region } = {}
        const subregionsByRegion: { [uuid: string]: Subregion[] } = {}

        const prefix = uuid();

        unclaimedSubregions.forEach(subregion => {
            if (subregion.region.uuid in subregionsByRegion) subregionsByRegion[subregion.region.uuid].push(subregion);
            else subregionsByRegion[subregion.region.uuid] = [subregion];
            if (subregion.region.uuid in regions) return;
            regions[subregion.region.uuid] = subregion.region;
        });


        Object.values(regions).forEach(region => {
        })

        await ctx.reply("In which region is the subregion you want to claim?", Markup.inlineKeyboard(
            Object.values(regions).map(region => {
                const id = uuid();
                this.action(id, async (ctx) => this.offerSubregions(ctx, subregionsByRegion[region.uuid], challengeUuid, alreadySelectedSubregions));
                return Markup.button.callback(region.name, id)
            }),
            { columns: 1 }
        ));
    }

    public async offerSubregions(ctx: JetlagContext, subregions: Subregion[], challengeUuid: string, alreadySelectedSubregions: string[]) {
        await ctx.editMessageReplyMarkup(null);

        let challenge: Challenge = await ctx.gameLifecycle.runAction(GetChallenge, {uuid: challengeUuid});
        if(challenge.completed) {
            await ctx.reply("Challenge is already completed");
            await ctx.scene.leave();
            return;
        }

        const prefix = uuid();

        let callback = async (ctx, subregionUuid) => {
            if (challenge.awardsSubregions == alreadySelectedSubregions.length + 1) {
                return this.complete(ctx, challenge.uuid, [...alreadySelectedSubregions, subregionUuid])
            }
            else {
                return this.offerRegions(ctx, challenge.uuid, [...alreadySelectedSubregions, subregionUuid])
            }
        };

        await ctx.reply("Which subregion do you want to claim?", Markup.inlineKeyboard(
            subregions.filter(subregion => !alreadySelectedSubregions.includes(subregion.uuid)).map(subregion => {
                const id = uuid();
                this.action(id, async (ctx) => callback(ctx, subregion.uuid));
                return Markup.button.callback(subregion.name, id)
            }),
            { columns: 1 }
        ))
    }

    public async complete(ctx: JetlagContext, challengeUuid: string, subregionUuids: string[]) {
        await ctx.editMessageReplyMarkup(null);
        try {
            await ctx.gameLifecycle.runAction(CompleteChallenge, {
                user: ctx.user,
                challengeUuid: challengeUuid,
                subregionUuids: subregionUuids
            });
            await ctx.reply("Challenge marked as completed!");
        }
        catch (e) {
            console.log(e);
            await ctx.reply("Error: " + e.message);
        }
        finally {
            await ctx.scene.leave();
        }
    }
}