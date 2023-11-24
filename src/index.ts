import "reflect-metadata";

import { Bot } from "./bot";
import { Challenge } from "./models/Challenge";
import { Team } from "./models/Team";
import { Player } from "./models/Player";
import { Subregion } from "./models/Subregion";
import { Region } from "./models/Region";
import { Game } from "./models/Game";
import { DataSource } from "typeorm";
import { BattleChallenge } from "./models/BattleChallenge";
import { Attack } from "./models/Attack";
import { Curse } from "./models/Curse";
import { CurseAssignment } from "./models/CurseAssignment";
import { Web } from "./web/index"
import { Config } from "./config";

const config: Config = {
    mapboxPulicKey: process.env.JETLAG_MAPBOX_PUBLIC_KEY,
    telegramBotToken: process.env.JETLAG_BOT_TOKEN,
    publicUrl: process.env.JETLAG_PUBLIC_URL,
    database: {
        host: process.env.JETLAG_PG_HOST,
        port: parseInt(process.env.JETLAG_PG_PORT),
        user: process.env.JETLAG_PG_USER,
        password: process.env.JETLAG_PG_PASSWORD,
        database: process.env.JETLAG_PG_DATABASE
    }
}

const datasource = new DataSource({
    type: "postgres",

    host: config.database.host,
    port: config.database.port,
    username: config.database.user,
    password: config.database.password,

    entities: [Game, Team, Player, Region, Subregion, Challenge, BattleChallenge, Attack, Curse, CurseAssignment],
    
    logging: true,
    synchronize: true
});

const web = new Web(8080, datasource, config);

datasource.initialize();

const bot = new Bot(process.env.JETLAG_BOT_TOKEN, datasource, config);

bot.run();