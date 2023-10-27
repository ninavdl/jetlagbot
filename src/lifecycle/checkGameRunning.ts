import { GameLifecycleAction } from "./lifecycle";

export class CheckGameRunning extends GameLifecycleAction<boolean, void> {
    public async run(): Promise<boolean> {
        return this.game.running;
    }
}