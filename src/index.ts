import "reflect-metadata";

import { Bot } from "./bot";
import { Challenge } from "./models/Challenge";
import { Team } from "./models/Team";
import { Player } from "./models/Player";
import { Subregion } from "./models/Subregion";
import { Region } from "./models/Region";
import { Game } from "./models/Game";
import { DataSource } from "typeorm";

const datasource = new DataSource({
    type: "sqlite",
    database: "./db.sqlite",
    entities: [Game, Team, Player, Region, Subregion, Challenge],
    logging: true,
    synchronize: true
});

datasource.initialize();

const bot = new Bot(process.env.JETLAG_BOT_TOKEN, datasource);

bot.run();