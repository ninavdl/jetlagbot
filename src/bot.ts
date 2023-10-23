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
import { CompleteChallengeScene } from './bot/completeChallenge';
import { GetChallengesScene } from './bot/getChallenges';
import { GetTeamStatusScene } from './bot/teamStatus';
import { StartAttackScene } from './bot/startAttack';
import { FinishAttackScene } from './bot/finishAttack';

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
            HelloScene,
            CompleteChallengeScene,
            GetChallengesScene,
            GetTeamStatusScene,
            StartAttackScene,
            FinishAttackScene
        ]

        const scenes = sceneTypes.map(sceneType => new sceneType(this.telegraf));

        const stage = new Scenes.Stage<JetlagContext>(scenes);

        this.telegraf.catch((err, ctx) => {
            console.log(err);
        })

        this.telegraf.use((ctx, next) => {
            console.log(ctx);
            next();
        })
        this.telegraf.use((ctx, next) => {
            ctx.gameLifecycle = new GameLifecycle(this.dataSource, this.telegraf);
            ctx.user = {
                displayName: ctx.from.username == null ? ctx.from.first_name : ctx.from.username,
                telegramUserId: ctx.from.id
            }
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

