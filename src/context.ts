import { Context, Scenes } from 'telegraf';
import { GameLifecycle } from './lifecycle/lifecycle';

export interface JetlagContext extends Context {
    gameLifecycle: GameLifecycle;
	scene: Scenes.SceneContextScene<JetlagContext>;
}