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
    publicUrl: process.env.JETLAG_PUBLIC_URL
}

const datasource = new DataSource({
    type: "sqlite",
    database: "./db.sqlite",
    entities: [Game, Team, Player, Region, Subregion, Challenge, BattleChallenge, Attack, Curse, CurseAssignment],
    logging: "all",
    synchronize: true
});

const web = new Web(8080, datasource, config);

datasource.initialize();

const bot = new Bot(process.env.JETLAG_BOT_TOKEN, datasource, config);

bot.run();