import { BattleChallenge } from "../models/BattleChallenge"
import { GameLifecycleAction } from "./lifecycle"

export type ImportBattleChallengesArgs = {
    items: {
        name: string,
        description: string,
        timeLimitInMinutes?: number
    }[]
}

export class ImportBattleChallenges extends GameLifecycleAction<number, ImportBattleChallengesArgs> {
    public async run(): Promise<number> {
        return (await this.entityManager.save(
            this.args.items.map((input) => {
                const battleChallenge = new BattleChallenge();
                battleChallenge.game = this.game;
                battleChallenge.name = input.name;
                battleChallenge.description = input.description;
                battleChallenge.timeInMinutes = input.timeLimitInMinutes;

                return battleChallenge;
            })
        )).length;
    }
}