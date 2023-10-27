import { Markup } from "telegraf";
import { GetCurrentAttack } from "../lifecycle/getCurrentAttack";
import { CommandScene } from "./command";
import { Attack } from "../models/Attack";
import { CompleteBattleChallenge } from "../lifecycle/completeBattleChallenge";
import {v4 as uuid} from "uuid";

export class FinishAttackScene extends CommandScene {
    getInitCommand(): string {
        return "finishattack"
    }

    getDescription(): string {
        return "Complete a battle challenge"
    }

    setup() {
        this.enter(async (ctx) => {
            try {
                this.assertPrivateChat(ctx);

                const attack: Attack = await ctx.gameLifecycle.runAction(GetCurrentAttack, {user: ctx.user});

                const actionAttackingWins = uuid();
                const actionAttackedWins = uuid();

                await ctx.reply("Which team has won the battle challenge?", Markup.inlineKeyboard([
                    Markup.button.callback(attack.attackingTeam.name, actionAttackingWins),
                    Markup.button.callback(attack.attackedTeam.name, actionAttackedWins)
                ], {columns: 1}));

                this.action(actionAttackingWins, async (ctx) => {
                    await ctx.editMessageReplyMarkup(null);
                    await ctx.gameLifecycle.runAction(CompleteBattleChallenge, {attackUuid: attack.uuid, winningTeamUuid: attack.attackingTeam.uuid});
                    await ctx.reply("Attack ended in favor of team " + attack.attackingTeam.name);
                    await ctx.scene.leave();
                });

                this.action(actionAttackedWins, async (ctx) => {
                    await ctx.editMessageReplyMarkup(null);
                    await ctx.gameLifecycle.runAction(CompleteBattleChallenge, {attackUuid: attack.uuid, winningTeamUuid: attack.attackedTeam.uuid});
                    await ctx.reply("Attack ended in favor of team " + attack.attackedTeam.name);
                    await ctx.scene.leave();
                }); 
            }
            catch(e) {
                console.log(e);
                await ctx.reply(e.message);
                await ctx.scene.leave();
            }
        })
    }
}