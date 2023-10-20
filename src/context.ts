import { Context, Scenes } from 'telegraf';
import { GameLifecycle } from './gameLifecycle';

export interface JetlagContext extends Context {
    gameLifecycle: GameLifecycle;
	scene: Scenes.SceneContextScene<JetlagContext>;
}