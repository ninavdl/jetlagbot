import { Equal } from "typeorm"
import { Region } from "../models/Region"
import { GameLifecycle, GameLifecycleAction } from "./lifecycle"
import { Subregion } from "../models/Subregion"

export type ImportSubregionsArgs = {
    items: {
        name: string,
        regionName: string,
        areaInSquareKilometers: number
    }[]
}

export class ImportSubregions extends GameLifecycleAction<number, ImportSubregionsArgs> {
    public async run(): Promise<number> {
        const regionsByName: { [name: string]: Region } = {}

        const subregions = [];

        for (let inputSubregion of this.args.items) {
            let region: Region;
            if (inputSubregion.regionName in regionsByName) {
                region = regionsByName[inputSubregion.regionName];
            } else {
                region = await this.entityManager.getRepository(Region).findOneBy({
                    name: Equal(inputSubregion.regionName),
                    game: Equal(this.game.uuid)
                });

                if (region == null) {
                    region = new Region();
                    region.name = inputSubregion.regionName;
                    region.game = this.game;
                }

                regionsByName[inputSubregion.regionName] = region;
            }

            const subregion = new Subregion();
            subregion.region = region;
            subregion.name = inputSubregion.name;
            subregion.areaInSquareKilometers = inputSubregion.areaInSquareKilometers;
            subregions.push(subregion);
        }

        await this.entityManager.save([
            ...Object.values(regionsByName),
            ...subregions,
        ]);

        return subregions.length;
    }
}