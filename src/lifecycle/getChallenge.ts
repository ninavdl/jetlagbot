import { Challenge } from "../models/Challenge";
import { GameLifecycleAction } from "./lifecycle";

export type GetChallengeArgs = {uuid: string}

export class GetChallenge extends GameLifecycleAction<Challenge, GetChallengeArgs> {
    public async run(): Promise<Challenge> {
        return this.entityManager.getRepository(Challenge).findOneBy(this.args);
    }
}