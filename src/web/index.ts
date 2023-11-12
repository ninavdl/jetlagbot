import * as Koa from "koa"
import * as Router from "koa-router";
import * as serve from "koa-static";
import { GameLifecycle } from "../lifecycle/lifecycle";
import { WebContext } from "./context";
import { GetGame } from "../lifecycle/getGame";
import { DataSource } from "typeorm";
import { Team } from "../models/Team";
import { Subregion } from "../models/Subregion";
import { ListClaimedSubregions } from "../lifecycle/listClaimedSubregions";
import { Config } from "../config";
import { Game } from "../models/Game";

export class Web {
    app: Koa;

    constructor(
        private port: number,
        private dataSource: DataSource,
        private config: Config
    ) {
        this.app = new Koa<Koa.DefaultState, WebContext>();

        this.app.context.gameLifecycle = new GameLifecycle(dataSource, null);

        const router = new Router<Koa.DefaultState, WebContext>();

        router.get("/config/mapbox-public-key", async(ctx, next) => {
            ctx.response.body = {"publicKey": this.config.mapboxPulicKey};
            ctx.response.type = "json"

            next();
        });

        router.get("/game/:gameUuid/geojson", async (ctx, next) => {
            const game: Game = await ctx.gameLifecycle.runAction(GetGame, {withGeoJson: true}, ctx.params["gameUuid"]);

            ctx.response.body = {
                type: "FeatureCollection",
                features: JSON.parse(game.geoJson)
            };
            ctx.response.type = "json";

            ctx.set({"Cache-Control": "public, max-age=3600"})

            next();
        })

        router.get("/game/:gameUuid/claimed-subregions", async (ctx, next) => {
            const claimedSubregions: Subregion[] = await ctx.gameLifecycle.runAction(ListClaimedSubregions, null, ctx.params["gameUuid"]);

            const claimedSubregionsByTeam: { [uuid: string]: Subregion[] } = {}
            const teamsByUuid: { [uuid: string]: Team } = {}

            for (let subregion of claimedSubregions) {
                if (!(subregion.team.uuid in teamsByUuid)) {
                    teamsByUuid[subregion.team.uuid] = subregion.team;
                    claimedSubregionsByTeam[subregion.team.uuid] = [];
                }
                claimedSubregionsByTeam[subregion.team.uuid].push(subregion)
            }

            ctx.response.body = {
                teams: Object.entries(claimedSubregionsByTeam).map(([teamUuid, subregions]) => ({
                    uuid: teamUuid,
                    name: teamsByUuid[teamUuid].name,
                    subregions: subregions.map(subregion => ({
                        uuid: subregion.uuid,
                        id: subregion.id,
                        name: subregion.name
                    }))
                }))
            };
            ctx.response.type = 'json'
            next();
        });

        this.app.use(router.routes()).use(router.allowedMethods());

        this.app.use(serve(__dirname + "/../../static", {}));

        this.app.listen(port, () => {
            console.log("Webserver started on port " + port);
        })
    }


}