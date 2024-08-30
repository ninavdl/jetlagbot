import { Telegraf, Scenes, session } from 'telegraf';
import { JetlagContext } from './context';
import { GameLifecycle } from './lifecycle/lifecycle';
import { DataSource } from 'typeorm';
import { CreateGameScene } from './bot/init/createGame';
import { CreateTeamScene } from './bot/init/createTeam';
import { JoinTeamScene } from './bot/init/joinTeam';
import { StartGameScene } from './bot/init/startGame';
import { CommandScene } from './bot/command';
import { HelloScene } from './bot/init/hello';
import { CompleteChallengeScene } from './bot/challenge/completeChallenge';
import { GetChallengesScene } from './bot/challenge/getChallenges';
import { GetTeamStatusScene } from './bot/status/teamStatus';
import { StartAttackScene } from './bot/battlechallenge/startAttack';
import { FinishAttackScene } from './bot/battlechallenge/finishAttack';
import { LeaderboardScene } from './bot/status/leaderboard';
import { PowerupScene } from './bot/powerup/powerup';
import { ListCursesScene } from './bot/powerup/listCurses';
import { CurseScene } from './bot/powerup/curse';
import { ImportScene } from './bot/init/import';
import { ClaimedSubregionsScene } from './bot/status/claimedSubregions';
import { CardSwapScene } from './bot/powerup/cardSwap';
import { MapScene } from './bot/status/map';
import { Config } from './config';
import { CompleteMissionScene } from './bot/challenge/completeMission';
import { MissionPeekScene } from './bot/powerup/missionPeek';

type SceneConstructor = { new(telegraf: Telegraf<JetlagContext>): CommandScene }

export class Bot {
    telegraf: Telegraf<JetlagContext>;
    gameLifecycle: GameLifecycle;

    private pollAnswers: { [pollId: string]: number[] } = {};

    constructor(token: string, private dataSource: DataSource, private config: Config) {
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
            FinishAttackScene,
            LeaderboardScene,
            PowerupScene,
            ListCursesScene,
            CurseScene,
            ImportScene,
            ClaimedSubregionsScene,
            CardSwapScene,
            MapScene,
            CompleteMissionScene,
            MissionPeekScene
        ]

        const scenes = sceneTypes.map(sceneType => new sceneType(this.telegraf));

        const stage = new Scenes.Stage<JetlagContext>(scenes);

        this.telegraf.catch((err, ctx) => {
            console.log(err);
        })

        this.telegraf.use((ctx, next) => {
            console.log(ctx);

            if (ctx.pollAnswer != null) {
                // Workaround: In scenes we can't listen to poll answers (https://github.com/telegraf/telegraf/issues/1538)
                // therefore we collect poll answers globally
                if (ctx.pollAnswer.poll_id in this.pollAnswers) {
                    this.pollAnswers[ctx.pollAnswer.poll_id] = ctx.pollAnswer.option_ids;
                }
            }

            next();
        })
        this.telegraf.use((ctx, next) => {
            ctx.gameLifecycle = new GameLifecycle(this.dataSource, this.telegraf);
            ctx.user = ctx.from == null ? null : {
                displayName: ctx.from.username == null ? ctx.from.first_name : ctx.from.username,
                telegramUserId: ctx.from.id
            }

            ctx.bot = this;

            ctx.config = this.config;
            return next();
        });
        this.telegraf.use(session());

        this.telegraf.use(stage.middleware());
        
        scenes.forEach(scene => scene.init());

        this.telegraf.telegram.setMyCommands(scenes.filter(scene => scene.getInitCommand() != null).map(scene => ({
            command: "/" + scene.getInitCommand().toLowerCase(),
            description: scene.getDescription()
        })));
    }

    run() {
        this.telegraf.launch();

        process.once('SIGINT', () => this.telegraf.stop('SIGINT'))
        process.once('SIGTERM', () => this.telegraf.stop('SIGTERM'))
    }

    collectAnswersToPoll(pollId: string) {
        this.pollAnswers[pollId] = [];
    }

    stopCollectingAnswersToPoll(pollId: string) {
        delete this.pollAnswers[pollId];
    }

    getPollAnswers(pollId: string) {
        return this.pollAnswers[pollId];
    }
}

