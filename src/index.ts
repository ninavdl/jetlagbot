import "reflect-metadata";

import { Bot } from "./bot";

const bot = new Bot(process.env.JETLAG_BOT_TOKEN);

bot.run();