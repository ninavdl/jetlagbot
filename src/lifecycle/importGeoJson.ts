import { Game } from "../models/Game";
import { Region } from "../models/Region";
import { Subregion } from "../models/Subregion";
import { GameLifecycleAction } from "./lifecycle";
import type {Feature} from "geojson"

export type ImportGeoJsonArgs = {geoJson: string}

export class ImportGeoJson extends GameLifecycleAction<number, ImportGeoJsonArgs> {
    public async run(): Promise<number> {
        const parsed: Feature[] = JSON.parse(this.args.geoJson)
        this.game.geoJson = this.args.geoJson;


        const regionsById: {[regionId: string]: Region} = {}

        const subregions: Subregion[] = [];
        
        for (const feature of parsed) {
            const subregionId: string = feature.properties["LAU_ID"];
            const regionId: string = feature.properties["NUTS3_CODE"];
            const subregionName: string = feature.properties["LAU_NAME"];
            const regionName: string = feature.properties["NUTS3_NAME"]
            const subregionArea: number = feature.properties["AREA_KM2"]

            let region: Region;
            if(!(regionId in regionsById)) {
                region = new Region();
                region.game = this.game;
                region.name = regionName;
                region.subregions = [];
                regionsById[regionId] = region; 
            } else {
                region = regionsById[regionId];
            }

            const subregion = new Subregion();
            subregion.region = region;
            subregion.id = subregionId;
            subregion.name = subregionName;
            subregion.areaInSquareKilometers = subregionArea;

            region.subregions.push(subregion);            
            subregions.push(subregion);
        }

        await this.entityManager.save([
            this.game,
            ...subregions,
            ...Object.values(regionsById)
        ]);

        return subregions.length;
    }
}