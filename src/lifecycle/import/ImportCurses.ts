import { Curse } from "../../models/Curse"
import { GameLifecycleAction } from "../lifecycle"

export type ImportCursesArgs = {
    items: {
        name: string,
        description: string,
        timeLimitInMinutes?: number
    }[]
}

export class ImportCurses extends GameLifecycleAction<number, ImportCursesArgs> {
    public async run(): Promise<number> {
        return (await this.entityManager.save(
            this.args.items.map(item => {
                const curse = new Curse();
                curse.game = this.game;
                curse.name = item.name;
                curse.description = item.description.trim();
                curse.timeoutInMinutes = item.timeLimitInMinutes;
                return curse;
            })
        )).length;
    }
}