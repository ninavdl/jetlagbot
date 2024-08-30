import { Markup } from "telegraf";
import { SupplyPlayer } from "../../lifecycle/helper/supplyPlayer";
import { Player } from "../../models/Player";
import { escapeMarkdown, sortByPropertyAlphabetical } from "../../util";
import { CommandScene } from "../command";
import { v4 as uuid } from "uuid";
import { JetlagContext } from "../../context";
import { CurseAssignment } from "../../models/CurseAssignment";
import { DrawCurse } from "../../lifecycle/curse/drawCurse";
import { LocationOff } from "../../lifecycle/powerup/locationOff";
import { UnassignLocationPowerup } from "../../lifecycle/powerup/unassignLocationPowerup";
import { RedrawChallenges } from "../../lifecycle/powerup/redrawChallenges";
import { Challenge } from "../../models/Challenge";
import { ListUnclaimedRegions } from "../../lifecycle/helper/listUnclaimedSubregions";
import { Subregion } from "../../models/Subregion";
import { Region } from "../../models/Region";
import { DirectClaim } from "../../lifecycle/powerup/directClaim";
import { CardSwapScene } from "./cardSwap";
import { CurseImmunity } from "../../lifecycle/powerup/curseImmunity";
import { UnassignCurseImmunity } from "../../lifecycle/powerup/unassignCurseImmunity";
import { MissionPeekScene } from "./missionPeek";
import { RedrawMissions } from "../../lifecycle/powerup/redrawMissions";

type Powerup = {
    name: string,
    description: string
    stars: number,
    method: (ctx: JetlagContext) => Promise<void>,
}

const CURSE_IMMUNITY_MINUTES = 30;

type PowerupType = "Curse" | "LocationOff" | "CardSwap" | "RedrawCards" | "DirectClaim" | "CurseImmunity" | "MissionPeek" | "RedrawMissions";


export class PowerupScene extends CommandScene {
    getInitCommand(): string {
        return "powerup";
    }

    getDescription(): string {
        return "Buy a powerup"
    }

    powerups: { [key in PowerupType]: Powerup } = {
        "Curse": {
            name: "Curse",
            description: "Curse another team",
            stars: 2,
            method: this.powerupCurse
        },
        "CurseImmunity": {
            name: "Curse immunity",
            description: `Your team can't be cursed for ${CURSE_IMMUNITY_MINUTES}min`,
            stars: 2,
            method: this.powerupCurseImmunity
        },
        "LocationOff": {
            name: "Location off",
            description: "Turn off your location for 1 hour",
            stars: 2,
            method: this.powerupLocationOff
        },
        "CardSwap": {
            name: "Card swap",
            description: "Pick three cards of another teams hand, and three cards of your hand, and swap them",
            stars: CardSwapScene.starsToDeduct,
            method: this.powerupCardSwap
        },
        "MissionPeek": {
            name: "Peek missions",
            description: "See the missions another team has on their hand",
            stars: MissionPeekScene.starsToDeduct,
            method: this.powerupMissionPeek
        },
        "RedrawCards": {
            name: "Redraw cards",
            description: "Get a new random set of challenges",
            stars: 3,
            method: this.powerupRedrawCards
        },
        "RedrawMissions": {
            name: "Redraw missions",
            description: "Get a new random set of missions",
            stars: 4,
            method: this.powerupRedrawMissions
        },
        "DirectClaim": {
            name: "Direct claim",
            description: "Claim your current subregion without completing a challenge",
            stars: 7,
            method: this.powerupDirectClaim
        }
    };

    setup() {
        this.enter(async (ctx) => {
            try {
                this.assertPrivateChat(ctx);

                const player: Player = await ctx.gameLifecycle.runAction(SupplyPlayer, { user: ctx.user, withTeam: true });

                const abortId = uuid();
                this.action(abortId, async (ctx) => {
                    await ctx.editMessageReplyMarkup(null);
                    await ctx.scene.leave();
                });

                const powerupText = `The following powerups exist:\n\n`
                    + Object.values(this.powerups).map(powerup => `*${escapeMarkdown(powerup.name)}* \\(${powerup.stars} ⭐\\)\n${escapeMarkdown(powerup.description)}`).join("\n\n");

                const availablePowerups = Object.entries(this.powerups).filter(([_, powerup]) => powerup.stars <= player.team.stars);

                if (availablePowerups.length != 0) {
                    await ctx.replyWithMarkdownV2(
                        powerupText
                        + `\n\nYou currently have ${player.team.stars} stars\\. Which powerup do you want to buy?`,
                        Markup.inlineKeyboard(
                            [
                                ...availablePowerups.map(([powerupType, powerup]: [PowerupType, Powerup]) => {
                                    const id = uuid();

                                    this.action(id, async (ctx) => {
                                        await this.selectPowerup(ctx, powerupType)
                                    })

                                    return Markup.button.callback(powerup.name, id);
                                }),
                                Markup.button.callback("Cancel", abortId)
                            ], { columns: 1 })
                    )
                }
                else {
                    await ctx.replyWithMarkdownV2(
                        powerupText + `\n\nYou currently have ${player.team.stars} stars and can't affor any powerup 😔`
                    );
                    await ctx.scene.leave();
                }
            }
            catch (e) {
                console.log(e);
                await ctx.reply("Error: " + e.message);
                await ctx.scene.leave();
            }
        }
        )
    };

    async selectPowerup(ctx: JetlagContext, powerupType: PowerupType) {
        await ctx.editMessageReplyMarkup(null);
        return this.powerups[powerupType].method.call(this, ctx);
    }

    async powerupCurse(ctx: JetlagContext) {
        try {
            const curseAssignment: CurseAssignment = await ctx.gameLifecycle.runAction(DrawCurse,
                { user: ctx.user, requiredStars: this.powerups["Curse"].stars });

            await ctx.reply("You have drawn the following curse:\n\n" +
                curseAssignment.curse.toMarkdown() +
                "\n\nYou can use it on another team using \\/curse", { parse_mode: "MarkdownV2" });
        }
        catch (e) {
            console.log(e);
            await ctx.reply(e.message);
        }
        finally {
            await ctx.scene.leave();
        }
    }

    async powerupLocationOff(ctx: JetlagContext) {
        try {
            await ctx.gameLifecycle.runAction(LocationOff, { user: ctx.user, stars: this.powerups["LocationOff"].stars });

            await ctx.reply("You may now turn off your location for 1 hour. Remember to turn it on again afterwards!");

            ctx.gameLifecycle.scheduler.schedule(async (gameLifecycle) => {
                gameLifecycle.runAction(UnassignLocationPowerup, { user: ctx.user })
            }, 20);
        }
        catch (e) {
            console.log(e);
            await ctx.reply(e.message);
        }
        finally {
            await ctx.scene.leave();
        }

    }

    async powerupCardSwap(ctx: JetlagContext) {
        await ctx.scene.enter(CardSwapScene.name)
    }

    async powerupRedrawCards(ctx: JetlagContext) {
        try {
            const newChallenges: Challenge[] = await ctx.gameLifecycle.runAction(RedrawChallenges, {
                user: ctx.user,
                stars: this.powerups["RedrawCards"].stars
            });

            await ctx.reply("Cards redrawn");
        }
        catch (e) {
            console.log(e);
            await ctx.reply("Error: " + e.message);
        }
        finally {
            await ctx.scene.leave();
        }
    }


    async powerupDirectClaim(ctx: JetlagContext) {
        try {
            const unclaimedSubregions: Subregion[] = await ctx.gameLifecycle.runAction(ListUnclaimedRegions, null);

            const regions: { [uuid: string]: Region } = {}
            const subregionsByRegion: { [uuid: string]: Subregion[] } = {}

            unclaimedSubregions.forEach(subregion => {
                if (subregion.region.uuid in subregionsByRegion) subregionsByRegion[subregion.region.uuid].push(subregion);
                else subregionsByRegion[subregion.region.uuid] = [subregion];
                if (subregion.region.uuid in regions) return;
                regions[subregion.region.uuid] = subregion.region;
            });

            const cancelId = uuid();
            this.action(cancelId, async (ctx) => ctx.scene.leave());

            await ctx.reply("In which region is the subregion you want to claim?",
                Markup.inlineKeyboard([
                    ...sortByPropertyAlphabetical(Object.values(regions), region => region.name).map(region => {
                        const id = uuid();
                        this.action(id, async (ctx) => await this.powerupDirectClaimSelectSubregion(ctx, subregionsByRegion[region.uuid]));
                        return Markup.button.callback(region.name, id);
                    })
                ], { columns: 1 })
            )
        }
        catch (e) {
            console.log(e);
            await ctx.reply("Error: " + e.message);
            await ctx.scene.leave();
        }
    }

    async powerupDirectClaimSelectSubregion(ctx: JetlagContext, subregions: Subregion[]) {
        try {
            await ctx.editMessageReplyMarkup(null);

            const cancelId = uuid();
            this.action(cancelId, async (ctx) => await ctx.scene.leave());

            await ctx.reply("Which subregion do you want to claim?", Markup.inlineKeyboard([
                ...sortByPropertyAlphabetical(subregions, subregion => subregion.name).map(subregion => {
                    const id = uuid();
                    this.action(id, async (ctx) => this.powerupDirectClaimSubregion(ctx, subregion.uuid));
                    return Markup.button.callback(subregion.name, id);
                })
            ], { columns: 1 }))
        }
        catch (e) {
            console.log(e);
            await ctx.reply("Error: " + e.message);
            await ctx.scene.leave();
        }
    }

    async powerupDirectClaimSubregion(ctx: JetlagContext, subregionUuid: string) {
        try {
            await ctx.editMessageReplyMarkup(null);

            const subregion: Subregion = await ctx.gameLifecycle.runAction(DirectClaim, { user: ctx.user, subregionUuid: subregionUuid, stars: this.powerups["DirectClaim"].stars });

            await ctx.reply(`Successfully claimed subregion '${subregion.name}'`);
        }
        catch (e) {
            console.log(e);
            await ctx.reply("Error: " + e.message)
        }
        finally {
            await ctx.scene.leave();
        }
    }

    async powerupCurseImmunity(ctx: JetlagContext) {
        try {
            await ctx.gameLifecycle.runAction(CurseImmunity, { user: ctx.user, stars: this.powerups["CurseImmunity"].stars, minutes: CURSE_IMMUNITY_MINUTES });
            await ctx.reply(`You are now immune to curses for ${CURSE_IMMUNITY_MINUTES}min`);

            ctx.gameLifecycle.scheduler.schedule(async (gameLifecycle) => {
                gameLifecycle.runAction(UnassignCurseImmunity, { user: ctx.user })
            }, CURSE_IMMUNITY_MINUTES * 60);
        }
        catch (e) {
            console.log(e);
            await ctx.reply(e.message);
        }
        finally {
            await ctx.scene.leave();
        }
    }

    async powerupMissionPeek(ctx: JetlagContext) {
        await ctx.scene.enter(MissionPeekScene.name)
    }

    async powerupRedrawMissions(ctx: JetlagContext) {
        try {
            await ctx.gameLifecycle.runAction(RedrawMissions, {user: ctx.user, starsToDeduct: this.powerups["RedrawMissions"].stars})
        }
        catch (e) {
            console.log(e);
            await ctx.reply(e.message);
        }
        finally {
            await ctx.scene.leave();
        }
    }
}