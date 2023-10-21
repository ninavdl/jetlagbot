import { Telegraf, Markup, Scenes, session } from 'telegraf';
import { JetlagContext } from './context';
import { message } from 'telegraf/filters';
import { GameLifecycle } from './lifecycle/lifecycle';
import { CreateGame } from './lifecycle/createGame';
import { CreateTeam } from './lifecycle/createTeam';
import { Team } from './models/Team';
import { ListTeams } from './lifecycle/listTeams';
import { JoinTeam } from './lifecycle/joinTeam';
import { Player } from './models/Player';
import { CheckGamePreconditions } from './lifecycle/checkGamePreconditions';
import { StartGame } from './lifecycle/startGame';
import { DataSource } from 'typeorm';
import { InitPlayer } from './lifecycle/initPlayer';

function getPlayerName(telegramUser: any): string {
    if (telegramUser.username == null) {
        return telegramUser.first_name + " " + telegramUser.last_name;
    }
    return telegramUser.username;
}

class CreateGameScene extends Scenes.BaseScene<JetlagContext> {
    static id = "CREATE_GAME";

    constructor() {
        super(CreateGameScene.id);

        this.enter(ctx => {
            ctx.reply('Game name?', Markup.forceReply());
        });

        this.on(message('text'), async (ctx) => {
            try {
                await ctx.gameLifecycle.runAction(CreateGame, { name: ctx.update.message.text });
                return ctx.reply("Game created. You can add teams now.");
            }
            catch (e) {
                console.log(e);
                await ctx.reply("Error: " + e.message);
            }
            finally {
                await ctx.scene.leave();
            }
        });
    }
}

class CreateTeamScene extends Scenes.BaseScene<JetlagContext> {
    static id = "CREATE_TEAM";

    constructor() {
        super(CreateTeamScene.id);

        this.enter(ctx => {
            ctx.reply("Team name?", Markup.forceReply());
        });

        this.on(message("text"), async (ctx) => {
            try {
                const team: Team = await ctx.gameLifecycle.runAction(CreateTeam, { name: ctx.update.message.text });
                return ctx.reply("Team '" + team.name + "' created.");
            }
            catch (e) {
                console.log(e);
                await ctx.reply("Error: " + e.message);
            }
            finally {
                ctx.scene.leave();
            }
        })
    }
}

class JoinTeamScene extends Scenes.BaseScene<JetlagContext> {
    static id = "JOIN_TEAM";

    constructor() {
        super(JoinTeamScene.id);

        this.enter(async (ctx) => {
            const teams: Team[] = await ctx.gameLifecycle.runAction(ListTeams, null);

            teams.forEach(team => {
                this.action(team.uuid, ctx => this.assign(team, ctx));
            })

            return ctx.reply("Select team", Markup.inlineKeyboard(teams.map(team =>
                Markup.button.callback(team.name, team.uuid)
            )));
        });

    }

    async assign(team: Team, ctx: JetlagContext): Promise<void> {
        let player: Player = await ctx.gameLifecycle.runAction(JoinTeam, {
            name: getPlayerName(ctx.callbackQuery.from),
            telegramUserId: ctx.callbackQuery.from.id,
            teamUuid: team.uuid
        })

        await ctx.reply("Assigned player '" + player.name + "' to team '" + team.name + "'");
        await ctx.editMessageReplyMarkup(null);
        await ctx.scene.leave();
    }
}

class StartGameScene extends Scenes.BaseScene<JetlagContext> {
    static id = "START_GAME";

    constructor() {
        super(StartGameScene.id);

        this.enter(async (ctx) => {
            try {
                await ctx.gameLifecycle.runAction(CheckGamePreconditions, null);

                await ctx.reply("Do you really want to start the game? It is not possible to modify teams, players, challenges afterwards.",
                    Markup.inlineKeyboard([
                        Markup.button.callback("Yes", "confirm"),
                        Markup.button.callback("No", "decline")
                    ]));
            } catch (e) {
                await ctx.reply("Error: " + e.message);
                await ctx.scene.leave();
            }
        })

        this.action("confirm", async (ctx) => {
            try {
                await ctx.editMessageReplyMarkup(null);
                await ctx.reply("Starting game. Challenges will be assigned");
                await ctx.gameLifecycle.runAction(StartGame, null);
            }
            catch (e) {
                await ctx.reply("Error: " + e.message);
                await ctx.scene.leave();
            }
        });

        this.action("decline", async (ctx) => {
            await ctx.editMessageReplyMarkup(null);
            await ctx.reply("Ok :(")
            await ctx.scene.leave();
        });
    }
}

export class Bot {
    telegraf: Telegraf<JetlagContext>;
    gameLifecycle: GameLifecycle;
    dataSource: DataSource;

    constructor(token: string, dataSource: DataSource) {
        this.telegraf = new Telegraf<JetlagContext>(token);
        this.dataSource = dataSource;

        const stage = new Scenes.Stage<JetlagContext>([
            new CreateGameScene(),
            new CreateTeamScene(),
            new JoinTeamScene(),
            new StartGameScene()
        ]);

        this.telegraf.use((ctx, next) => {
            ctx.gameLifecycle = new GameLifecycle(this.dataSource);
            return next();
        });
        this.telegraf.use(session());
        this.telegraf.use(stage.middleware());


        this.telegraf.command('createGame', ctx => ctx.scene.enter(CreateGameScene.id));
        this.telegraf.command('createTeam', ctx => ctx.scene.enter(CreateTeamScene.id));
        this.telegraf.command('joinTeam', ctx => ctx.scene.enter(JoinTeamScene.id));

        this.telegraf.command('hello', async (ctx) => {
            if (ctx.update.message.chat.type != "private") {
                await ctx.reply("This command has to be executed in a private chat");
                return;
            }
            try {
                await ctx.gameLifecycle.runAction(InitPlayer,
                    {
                        name: getPlayerName(ctx.update.message.from),
                        telegramUserId: ctx.update.message.from.id,
                        telegramChatId: ctx.update.message.chat.id
                    });
            }
            catch (e) {
                await ctx.reply("Error: " + e.message);
            }

            await ctx.reply("Successfully initiated bot");
        })

        this.telegraf.command('start', ctx => ctx.scene.enter(StartGameScene.id))
    }

    run() {
        this.telegraf.launch();

        process.once('SIGINT', () => this.telegraf.stop('SIGINT'))
        process.once('SIGTERM', () => this.telegraf.stop('SIGTERM'))
    }
}

