import { DataSource, EntityManager } from "typeorm";
import { Game } from "../models/Game";

export class GameError extends Error {

}

type ActionConstructor<ArgsType, ActionType> = { new(game: Game, gameId: string, entityManger: EntityManager, args: ArgsType): ActionType; }

export class GameLifecycle {
    gameId?: string;
    dataSource: DataSource;

    constructor(dataSource: DataSource) {
        this.dataSource = dataSource;
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

            let action = new actionConstructor(games.length == 0 ? null : games[0], this.gameId, entityManager, args);
            return action.run();
        })
    }
}

export abstract class GameLifecycleAction<ReturnType, ArgType> {
    constructor(
        protected game: Game,
        protected gameId: string,
        protected entityManager: EntityManager,
        protected args: ArgType) {
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
        let subAction: ActionType = new actionConstructor(this.game, this.gameId, this.entityManager, args);
        return subAction.run();
    }
}