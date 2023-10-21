import { Telegraf, Scenes, session } from 'telegraf';
import { JetlagContext } from './context';
import { GameLifecycle } from './lifecycle/lifecycle';
import { DataSource } from 'typeorm';
import { CreateGameScene } from './bot/createGame';
import { CreateTeamScene } from './bot/createTeam';
import { JoinTeamScene } from './bot/joinTeam';
import { StartGameScene } from './bot/startGame';
import { CommandScene } from './bot/command';
import { HelloScene } from './bot/hello';
import { Notifier } from './notifier';

type SceneConstructor = {new(telegraf: Telegraf<JetlagContext>): CommandScene}

export class Bot {
    telegraf: Telegraf<JetlagContext>;
    gameLifecycle: GameLifecycle;
    dataSource: DataSource;

    constructor(token: string, dataSource: DataSource) {
        this.telegraf = new Telegraf<JetlagContext>(token);
        this.dataSource = dataSource;

        const sceneTypes: SceneConstructor[] = [
            CreateGameScene,
            CreateTeamScene,
            JoinTeamScene,
            StartGameScene,
            HelloScene
        ]

        const scenes = sceneTypes.map(sceneType => new sceneType(this.telegraf));

        const stage = new Scenes.Stage<JetlagContext>(scenes);

        this.telegraf.use((ctx, next) => {
            ctx.gameLifecycle = new GameLifecycle(this.dataSource, this.telegraf);
            return next();
        });
        this.telegraf.use(session());
        this.telegraf.use(stage.middleware());

        scenes.forEach(scene => scene.init());

        this.telegraf.telegram.setMyCommands(scenes.map(scene => ({
            command: "/" + scene.getInitCommand().toLowerCase(),
            description: scene.getDescription()
        })));
    }

    run() {
        this.telegraf.launch();

        process.once('SIGINT', () => this.telegraf.stop('SIGINT'))
        process.once('SIGTERM', () => this.telegraf.stop('SIGTERM'))
    }
}

