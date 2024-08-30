import { Mission, MissionDifficulty } from "../models/Misssion";
import { GameLifecycleAction } from "./lifecycle";

export class ImportMissionsArgs {
    items: {
        title: string,
        description: string,
        difficulty: MissionDifficulty
    }[]
}

export class ImportMissions extends GameLifecycleAction<number, ImportMissionsArgs> {
    public async run() {
        return (await this.entityManager.save(this.args.items.map(item => {
            const mission = new Mission();
            mission.name = item.title;
            mission.description = item.description;
            mission.difficulty = item.difficulty;
            mission.game = this.game;
            return mission;
        }))).length;
    }
}