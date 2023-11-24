import { Challenge } from "../models/Challenge"
import { GameLifecycleAction } from "./lifecycle"

export type ImportChallengesArgs = {
    items: {
        name: string,
        description: string,
        stars: number,
        subregions: number,
        dynamicNumberOfStars: boolean
    }[]
}

export class ImportChallenges extends GameLifecycleAction<number, ImportChallengesArgs> {
    public async run() {
        return (await this.entityManager.save(
            this.args.items.map(input => {
                const challenge = new Challenge();
                challenge.game = this.game;
                challenge.awardsSubregions = input.subregions;
                challenge.name = input.name;
                challenge.description = input.description;
                challenge.stars = input.stars;
                challenge.dynamicNumberOfStars = input.dynamicNumberOfStars;
                return challenge
            })
        )).length;
    }
}