import { setuid } from "process";
import { CommandScene } from "./command";
import { JetlagContext } from "../context";
import { Markup, Scenes } from "telegraf";
import { v4 as uuid } from "uuid";
import { message } from "telegraf/filters";
import { File } from "buffer";
import { parse } from "csv-parse/sync";

import fetch from "node-fetch";
import { ImportChallenges } from "../lifecycle/importChallenges";
import { ImportBattleChallenges } from "../lifecycle/importBattleChallenges";
import { ImportCurses } from "../lifecycle/ImportCurses";
import { ImportSubregions } from "../lifecycle/importSubregions";

type ImportType = "Challenges" | "Curses" | "BattleChallenges" | "Subregions"

type Importer = {
    name: string,
    keys: string[],
    method: (ctx: JetlagContext, file) => Promise<void>
}

interface ImporterSceneSession extends Scenes.SceneSession {
    importType: ImportType
}

interface ImporterContext extends JetlagContext {
    session: ImporterSceneSession
}

export class ImportScene extends CommandScene<ImporterContext> {
    importers: { [key in ImportType]: Importer } = {
        "Challenges": {
            name: "Challenges",
            method: this.importChallenges,
            keys: ["title", "description", "stars", "claimsSubregions"]
        },
        "Curses": {
            name: "Curses",
            method: this.importCurses,
            keys: ["title", "description", "timeLimit"]
        },
        "BattleChallenges": {
            name: "Battle challenges",
            method: this.importBattleChallenges,
            keys: ["title", "description", "timeLimit"]
        },
        "Subregions": {
            name: "Subregions",
            method: this.importSubregions,
            keys: ["name", "regionName", "nuts3Code", "area"]
        }
    }

    getInitCommand(): string {
        return "import"
    }

    getDescription(): string {
        return "Import game data"
    }

    setup() {
        this.enter(async (ctx) => {
            const cancelId = uuid();

            this.action(cancelId, async (ctx) => {
                await ctx.editMessageReplyMarkup(null);
                await ctx.scene.leave();
            });

            await ctx.reply("What do you want to import?", Markup.inlineKeyboard(
                [
                    ...Object.entries(this.importers).map(([key, importer]: [ImportType, Importer]) => {
                        const id = uuid();
                        this.action(id, async (ctx) => {
                            this.uploadFile(ctx, key);
                        })
                        return Markup.button.callback(importer.name, id);
                    }),
                    Markup.button.callback("Cancel", cancelId)
                ],
                { columns: 1 }
            ))
        });

        this.on(message("document"), async(ctx) => {
            const file = await this.telegraf.telegram.getFile(ctx.message.document.file_id);
            const url = await this.telegraf.telegram.getFileLink(file.file_id);

            const response = await fetch(url);
            if (response.status != 200) {
                await ctx.reply("Error: " + response.statusText);
                return;
            }

            const importer = this.importers[ctx.session.importType]
            const data = parse(await response.text(), {
                delimiter: ";",
                encoding: "utf-8",
                columns: importer.keys,
                fromLine: 2 // skip header line
            });

            await this.importers[ctx.session.importType].method.call(this, ctx, data);

        })
    }

    async uploadFile(ctx: ImporterContext, importerType: ImportType) {
        try {
            await ctx.editMessageReplyMarkup(null);

            const importer = this.importers[importerType];

            await ctx.reply(`Please send the CSV file containing ${importer.name} to import (semicolon separated columns, utf-8)`, Markup.forceReply());
            ctx.session.importType = importerType;
        }
        catch (e) {
            console.log(e);
            await ctx.reply("Error: " + e.message);
            await ctx.scene.leave();
        }
    }

    async importChallenges(ctx: ImporterContext, data: { title: string, description: string, stars: string, claimsSubregions: string }[]) {
        try {
            const n = await ctx.gameLifecycle.runAction(ImportChallenges, {
                items: data.map(input => ({
                    name: input.title,
                    description: input.description,
                    stars: parseInt(input.stars),
                    subregions: parseInt(input.claimsSubregions)
                }))
            });

            await ctx.reply(`Imported ${n} challenges`);
        }
        catch (e) {
            console.log(e);
            await ctx.reply("Error: " + e.message);
        }
        finally {
            await ctx.scene.leave();
        }
    }

    async importBattleChallenges(ctx: ImporterContext, data: { title: string, description: string, timeLimit: string }[]) {
        try {
            const n = await ctx.gameLifecycle.runAction(ImportBattleChallenges, {
                items: data.map(input => ({
                    name: input.title,
                    description: input.description,
                    timeLimitInMinutes: (input.timeLimit == "" || input.timeLimit == null) ? null : parseInt(input.timeLimit.replace("m", ""))
                }))
            });

            await ctx.reply(`Imported ${n} battle challenges`);
        }
        catch (e) {
            console.log(e);
            await ctx.reply("Error: " + e.message);
        }
        finally {
            await ctx.scene.leave();
        }

    }

    async importCurses(ctx: ImporterContext, data: { title: string, description: string, timeLimit: string }[]) {
        try {
            const n = await ctx.gameLifecycle.runAction(ImportCurses, {
                items: data.map(input => ({
                    name: input.title,
                    description: input.description,
                    timeLimitInMinutes: input.timeLimit == null || input.timeLimit == "" ? null : parseInt(input.timeLimit)
                }))
            });

            await ctx.reply(`Imported ${n} curses`);
        }
        catch (e) {
            console.log(e);
            await ctx.reply("Error: " + e.message);
        }
        finally {
            await ctx.scene.leave();
        }

    }

    async importSubregions(ctx: ImporterContext, data: { name: string, regionName: string, area: string }[]) {
        try {
            const n = await ctx.gameLifecycle.runAction(ImportSubregions, {
                items: data.map(input => ({
                    name: input.name,
                    regionName: input.regionName,
                    areaInSquareKilometers: parseInt(input.area)
                }))
            });

            await ctx.reply(`Imported ${n} subregions`);
        }
        catch (e) {
            console.log(e);
            await ctx.reply("Error: " + e.message);
        }
        finally {
            await ctx.scene.leave();
        }
    }
}