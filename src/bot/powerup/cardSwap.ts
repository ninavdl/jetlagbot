import { Markup, Scenes } from "telegraf";
import { CommandScene } from "../command";
import { ListTeams } from "../../lifecycle/listTeams";
import { Team } from "../../models/Team";
import { CardSwapListChallengeReturnType, CardSwapListChallenges } from "../../lifecycle/cardSwapListChallenges";
import { CardSwap } from "../../lifecycle/cardSwap";
import { JetlagContext } from "../../context";
import { Challenge } from "../../models/Challenge";


interface CardSwapSession extends Scenes.SceneSession {
    otherTeamUuid: string;

    ownChallengesPollId: string;
    otherChallengesPollId: string;
    messages: { chatId: number, messageId: number }[]

    ownChallengesOnHandUuids: string[];
    otherChallengesOnHandUuids: string[];

    totalNumberOfChallengesOnHand: number;
}

interface CardSwapContext extends JetlagContext {
    session: CardSwapSession
}

const numberOfChallengesToPick = 3;

export class CardSwapScene extends CommandScene<CardSwapContext> {
    static starsToDeduct = 3;

    setup() {
        this.enter(this.handleErrors(async (ctx) => {
            const teams: Team[] = await ctx.gameLifecycle.runAction(ListTeams, { withPlayers: true });

            await ctx.reply("Which team do you want to swap cards with?\n" +
                "As soon as you select a team, stars will be deducted!",
                Markup.inlineKeyboard(
                    [
                        ...teams.filter(team => !team.players.map(player => player.telegramId).includes(ctx.user.telegramUserId))
                            .map(team => Markup.button.callback(team.name, `team-${team.uuid}`)),
                        Markup.button.callback("Cancel", "cancel")
                    ], { columns: 1 }));
        }));

        this.action("cancel", this.handleErrors(async (ctx) => {
            await ctx.editMessageReplyMarkup(null);
            await ctx.scene.leave();
        }));

        this.action(/^team-(.*)$/, this.handleErrors(async (ctx) => {
            await ctx.editMessageReplyMarkup(null);
            ctx.session.otherTeamUuid = ctx.match[1];

            await this.offerChallenges(ctx);
        }));

        this.action("confirm", this.handleErrors(async (ctx) => {
            await this.performCardSwap(ctx);
        }));
    }

    private async offerChallenges(ctx: CardSwapContext, starsToDeductOverride: number = null) {
        ctx.session.messages = [];

        const challenges: CardSwapListChallengeReturnType = await ctx.gameLifecycle.runAction(CardSwapListChallenges, {
            user: ctx.user,
            teamUuid: ctx.session.otherTeamUuid,
            stars: starsToDeductOverride == null ? CardSwapScene.starsToDeduct : starsToDeductOverride
        });

        ctx.session.totalNumberOfChallengesOnHand = challenges.totalNumberOfChallengesOnHand;

        ctx.session.ownChallengesOnHandUuids = challenges.ownChallenges.map(c => c.uuid);
        ctx.session.otherChallengesOnHandUuids = challenges.otherChallenges.map(c => c.uuid);

        await ctx.reply(`The other team has the following challenges on their hand:\n\n`
            + challenges.otherChallenges.map(challenge => challenge.toMarkdown()).join("\n\n"), { parse_mode: "MarkdownV2" });

        const otherChallengesPoll = await ctx.replyWithPoll(
            `Which challenges of the other team do you pick? (select at most ${numberOfChallengesToPick})`,
            challenges.otherChallenges.map(challenge => challenge.name),
            { allows_multiple_answers: true, is_anonymous: false }
        );
        ctx.session.otherChallengesPollId = otherChallengesPoll.poll.id;
        ctx.session.messages.push({ chatId: otherChallengesPoll.chat.id, messageId: otherChallengesPoll.message_id });
        ctx.bot.collectAnswersToPoll(otherChallengesPoll.poll.id);

        await ctx.reply(`You have the following challenges on your hand:\n\n`
            + challenges.ownChallenges.map(challenge => challenge.toMarkdown()).join("\n\n"),
            { parse_mode: "MarkdownV2" });

        const ownChallengesPoll = await ctx.replyWithPoll(
            `Which of your own challenges do you pick? (select as many as in the previous poll)`,
            challenges.ownChallenges.map(challenge => challenge.name),
            { allows_multiple_answers: true, is_anonymous: false }
        );

        ctx.session.ownChallengesPollId = ownChallengesPoll.poll.id;
        ctx.session.messages.push({ chatId: ownChallengesPoll.chat.id, messageId: ownChallengesPoll.message_id });
        ctx.bot.collectAnswersToPoll(ownChallengesPoll.poll.id);

        const reply = await ctx.reply(`Select challenges in the polls and then confirm.`,
            Markup.inlineKeyboard([
                Markup.button.callback("Confirm", "confirm"),
                Markup.button.callback("Cancel", "cancel")
            ]));

        ctx.session.messages.push({ chatId: reply.chat.id, messageId: reply.message_id });
    }

    private async performCardSwap(ctx: CardSwapContext) {
        const selectedOwnChallengesUuids =
            ctx.bot.getPollAnswers(ctx.session.ownChallengesPollId).map(i => ctx.session.ownChallengesOnHandUuids[i]);

        const selectedOtherChallengesUuids =
            ctx.bot.getPollAnswers(ctx.session.otherChallengesPollId).map(i => ctx.session.otherChallengesOnHandUuids[i]);

        if (selectedOtherChallengesUuids.length != selectedOwnChallengesUuids.length) {
            await ctx.reply("You have to select the same number of challenges in both polls.");
            return;
        }

        if (selectedOtherChallengesUuids.length > numberOfChallengesToPick) {
            await ctx.reply(`You must not select more than ${numberOfChallengesToPick} challenges!`);
            return;
        }

        if (selectedOtherChallengesUuids.length == 0) {
            await ctx.reply("You have not selected any challenges.")
            return;
        }

        const challengesOnOwnHandAfterSwap =
            new Set([
                ...ctx.session.ownChallengesOnHandUuids
                    .filter(uuid => !selectedOwnChallengesUuids.includes(uuid)),
                ...selectedOtherChallengesUuids]);

        if (challengesOnOwnHandAfterSwap.size != ctx.session.totalNumberOfChallengesOnHand) {
            await ctx.reply(`Swap would result in you having ${challengesOnOwnHandAfterSwap.size} challenges on your hand. Select other challenges.`);
            return
        }

        const challengesOnOtherHandAfterSwap =
            new Set([
                ...ctx.session.otherChallengesOnHandUuids
                    .filter(uuid => !selectedOtherChallengesUuids.includes(uuid)),
                ...selectedOwnChallengesUuids
            ]);

        if (challengesOnOtherHandAfterSwap.size != ctx.session.totalNumberOfChallengesOnHand) {
            await ctx.reply(`Swap would result in the other team having ${challengesOnOtherHandAfterSwap.size} challenges on their hand. Select other challenges.`);
            return
        }

        await Promise.all(ctx.session.messages.map(message => ctx.telegram.deleteMessage(message.chatId, message.messageId)));

        try {
            const result: Challenge[] = await ctx.gameLifecycle.runAction(CardSwap, {
                user: ctx.user,
                teamUuid: ctx.session.otherTeamUuid,
                ownChallengeUuids: selectedOwnChallengesUuids,
                otherChallengeUuids: selectedOtherChallengesUuids
            });

            await ctx.scene.leave();
            await ctx.reply(`*Cards swapped successfully\\.* Your cards are now:\n\n`
                + result.map(challenge => challenge.toMarkdown()).join("\n\n"), { parse_mode: "MarkdownV2" });
            ctx.bot.stopCollectingAnswersToPoll(ctx.session.otherChallengesPollId);
            ctx.bot.stopCollectingAnswersToPoll(ctx.session.ownChallengesPollId);

        }
        catch (e) {
            // In case the other team has completed a challenge or otherwise changed the challenges on their hand
            // while this team was initiating the powerup, the GameLifecycleAction could fail.
            // In this case we want to restart it without deducting stars again.

            console.log(e);
            await ctx.reply("Error: " + e.message);
            await ctx.reply("Your or the other teams challenges might have changed while you were initiating the card swap. Try again:");

            ctx.session.ownChallengesPollId = null;
            ctx.session.otherChallengesPollId = null;
            ctx.bot.stopCollectingAnswersToPoll(ctx.session.otherChallengesPollId);
            ctx.bot.stopCollectingAnswersToPoll(ctx.session.ownChallengesPollId);

            await this.offerChallenges(ctx, 0);
        }
    }
}