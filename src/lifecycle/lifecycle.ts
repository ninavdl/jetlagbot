import { DataSource, EntityManager } from "typeorm";
import { Game } from "../models/Game";
import { Notifier } from "../notifier";
import { Telegraf } from "telegraf";
import { JetlagContext } from "../context";
import { Scheduler } from "../schedule";

export class GameError extends Error {

}

type ActionConstructor<ArgsType, ActionType> = {
    new(game: Game, gameId: string, entityManger: EntityManager, args: ArgsType, notifier: Notifier, scheduler: Scheduler): ActionType;
}

export class GameLifecycle {
    gameId?: string;
    scheduler: Scheduler;

    constructor(protected dataSource: DataSource, protected telegraf?: Telegraf<JetlagContext>) {
        this.scheduler = new Scheduler(this);
    }

    public async runAction<ActionType extends GameLifecycleAction<ReturnType, ArgsType>, ArgsType, ReturnType>(
        actionConstructor: ActionConstructor<ArgsType, ActionType>,
        args: ArgsType,
    ): Promise<ReturnType> {
        return this.dataSource.transaction(async (entityManager) => {
            // For now, the current game is always the last created one.
            // In the future, this should support running multiple bots in parallel.
            let games = await entityManager.getRepository(Game).find({
                order: {
                    createdAt: 'DESC'
                },
                take: 1
            });

            const game = games.length == 0 ? null : games[0];

            const notifier = new Notifier(game, entityManager, this.telegraf);

            let action = new actionConstructor(
                games.length == 0 ? null : games[0],
                this.gameId,
                entityManager,
                args,
                notifier,
                this.scheduler
            );
            return action.run();
        })
    }
}

export abstract class GameLifecycleAction<ReturnType, ArgType> {
    constructor(
        protected game: Game,
        protected gameId: string,
        protected entityManager: EntityManager,
        protected args: ArgType,
        protected notifier: Notifier,
        protected scheduler: Scheduler) {
    }

    public abstract run(): Promise<ReturnType>;

    protected async callSubAction<
        ActionType extends GameLifecycleAction<ReturnType2, ArgsType2>,
        ArgsType2,
        ReturnType2
    >(
        actionConstructor: ActionConstructor<ArgsType2, ActionType>,
        args: ArgsType2
    ): Promise<ReturnType2> {
        let subAction: ActionType = new actionConstructor(
            this.game,
            this.gameId,
            this.entityManager,
            args,
            this.notifier,
            this.scheduler);
        return subAction.run();
    }
}