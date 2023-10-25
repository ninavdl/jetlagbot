import { GameLifecycle } from "./lifecycle/lifecycle";

export class Scheduler {
    private timeouts: NodeJS.Timeout[] = [];

    public constructor(private lifecycle: GameLifecycle) {

    }

    public schedule(operation: (lifecycle: GameLifecycle) => Promise<void>, inSeconds: number) {
        this.timeouts.push(setTimeout(async () => {
            await operation(this.lifecycle);
        }, inSeconds * 1000));
    }
}