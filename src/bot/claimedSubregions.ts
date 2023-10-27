import { ListClaimedSubregions } from "../lifecycle/listClaimedSubregions";
import { Region } from "../models/Region";
import { Subregion } from "../models/Subregion";
import { escapeMarkdown } from "../util";
import { CommandScene } from "./command";

export class ClaimedSubregionsScene extends CommandScene {
    getInitCommand(): string {
        return "subregions"
    }

    getDescription(): string {
        return "List claimed subregions"
    }

    setup() {
        this.enter(async (ctx) => {
            const subregions: Subregion[] = await ctx.gameLifecycle.runAction(ListClaimedSubregions, null);

            const regionsByUuid: { [uuid: string]: Region } = {};
            const subregionsByRegionUuid: { [uuid: string]: Subregion[] } = {}
            for (let subregion of subregions) {
                if (!(subregion.region.uuid in regionsByUuid)) {
                    regionsByUuid[subregion.region.uuid] = subregion.region;
                }
                if (!(subregion.region.uuid in subregionsByRegionUuid)) {
                    subregionsByRegionUuid[subregion.region.uuid] = [];
                }

                subregionsByRegionUuid[subregion.region.uuid].push(subregion);
            }

            await ctx.reply(`The following subregions are currently claimed:\n\n`
                + Object.entries(subregionsByRegionUuid).map(([regionUuid, subregions]) =>
                    `*${escapeMarkdown(regionsByUuid[regionUuid].name)}*\n`
                    + subregions.map(subregion => `\\- ${escapeMarkdown(subregion.name)} \\(_${escapeMarkdown(subregion.team.name)}_\\)`)
                        .join("\n")
                ).join("\n\n"), { parse_mode: "MarkdownV2" });

            await ctx.scene.leave();
        })
    }
}