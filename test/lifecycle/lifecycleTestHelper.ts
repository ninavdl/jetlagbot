import { Connection, DataSource } from "typeorm";
import { Challenge } from "../../src/models/Challenge";
import { Game } from "../../src/models/Game";
import { Player } from "../../src/models/Player";
import { Region } from "../../src/models/Region";
import { Subregion } from "../../src/models/Subregion";
import { Team } from "../../src/models/Team";
import { GameLifecycle } from "../../src/lifecycle/lifecycle";
import { Telegraf } from "telegraf";
import { JetlagContext } from "../../src/context";
import {expect, jest, test} from '@jest/globals';

jest.mock("telegraf", () => {
    return {
        Telegraf: jest.fn((a, b) => ({
            telegram: {
                sendMessage: (chatId, message, options) => {
                    return Promise.resolve();
                }
            }
        }))
    }
});

export class LifecycleTestHelper {
    private static _instance: LifecycleTestHelper;

    private constructor() {}

    public static get instance(): LifecycleTestHelper {
        if(this._instance == null) {
            this._instance = new LifecycleTestHelper();
        }   

        return this._instance;
    }

    private _datasource!: DataSource;
    public static get dataSource(): DataSource {
        return this.instance._datasource;
    }

    private _mockedTelegraf: Telegraf<JetlagContext>;

    private _lifecycle: GameLifecycle;
    public static get lifecycle(): GameLifecycle {
        if(this.instance._lifecycle == null) {
            this.instance._lifecycle = new GameLifecycle(this.instance._datasource, this.mockedTelegraf);
        }

        return this.instance._lifecycle;
    }

    public static get mockedTelegraf(): Telegraf<JetlagContext> {
        if(this.instance._mockedTelegraf == null) {
            this.instance._mockedTelegraf = new Telegraf<JetlagContext>(null, null);
        }
        return this.instance._mockedTelegraf;
    }

    static async setup() {
        this.instance._datasource = new DataSource({
            type: "sqlite",
            database: ":memory:",
            entities: [Challenge, Game, Player, Region, Subregion, Team],
            synchronize: true
        })
        await this.instance._datasource.initialize()
    }

    static teardown() {
        this.instance._datasource.destroy()
        this.instance._datasource = null;
    }
}