import { Telegraf, Markup, Scenes, session } from 'telegraf';
import { JetlagContext } from './context';
import { GameLifecycle, GameError } from './gameLifecycle';
import { message } from 'telegraf/filters';

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
                console.log(ctx);
                await ctx.gameLifecycle.createGame(ctx.update.message.text);
                ctx.scene.leave();
                return ctx.reply("Game created. You can add teams now.");
            }
            catch (e) {
                console.log(e);
                await ctx.reply("Error: " + e.message);
                ctx.scene.leave();
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
                const team = await ctx.gameLifecycle.createTeam(ctx.update.message.text);
                ctx.scene.leave();
                return ctx.reply("Team '" + team.name + "' created.");
            }
            catch (e) {
                console.log(e);
                await ctx.reply("Error: " + e.message);
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
            const teams = await ctx.gameLifecycle.listTeams();

            teams.forEach(team => {
                this.action(team.uuid, async (ctx) => {
                    const player = await ctx.gameLifecycle.getPlayerFromTelegramId(getPlayerName(ctx.callbackQuery.from), ctx.callbackQuery.from.id)
                    await ctx.gameLifecycle.assignPlayerToTeam(
                        player.uuid,
                        team.uuid
                    );

                    await ctx.reply("Assigned player '" + player.name + "' to team '" + team.name + "'");
                    await ctx.scene.leave();
                })
            })

            return ctx.reply("Select team", Markup.inlineKeyboard(teams.map(team =>
                Markup.button.callback(team.name, team.uuid)
            )));
        })
    }
}

class StartGameScene extends Scenes.BaseScene<JetlagContext> {
    static id = "START_GAME";

    constructor() {
        super(StartGameScene.id);

        this.enter(async (ctx) => {
            const playersNotInitiated = await ctx.gameLifecycle.getPlayersNotInitiated();

            if(playersNotInitiated.length != 0) {
                await ctx.reply("The following players are not initiated yet:\n" + 
                    playersNotInitiated.map(player => player.name).join(", ") + ".\n" +
                    "They must send the /hello command to this bot in a private chat."
                );
                await ctx.scene.leave();
                return;
            }

            const allChallenges = await ctx.gameLifecycle.getAllChallenges();
            if( allChallenges.length == 0 ) {
                await ctx.reply("There are no challenges defined.");
                await ctx.scene.leave();
                return;
            }

            await ctx.reply("Do you really want to start the game? It is not possible to modify teams, players, challenges afterwards.",
                Markup.inlineKeyboard([
                    Markup.button.callback("Yes", "confirm"),
                    Markup.button.callback("No", "decline")
                ]));
        })

        this.action("confirm", async (ctx) => {
            await ctx.reply("Starting game. Challenges will be assigned");

            ctx.gameLifecycle.randomReassignAllChallenges();
        });

        this.action("decline", async (ctx) => {
            await ctx.scene.leave();
        });
    }
}

export class Bot {
    telegraf: Telegraf<JetlagContext>;
    gameLifecycle: GameLifecycle;

    constructor(token: string) {
        this.telegraf = new Telegraf<JetlagContext>(token);
        this.gameLifecycle = new GameLifecycle();

        const stage = new Scenes.Stage<JetlagContext>([
            new CreateGameScene(),
            new CreateTeamScene(),
            new JoinTeamScene(),
            new StartGameScene()
        ]);

        this.telegraf.use((ctx, next) => {
            ctx.gameLifecycle = this.gameLifecycle;
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
                await ctx.gameLifecycle.initPlayerChatId(
                    getPlayerName(ctx.update.message.from),
                    ctx.update.message.from.id,
                    ctx.update.message.chat.id);
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

