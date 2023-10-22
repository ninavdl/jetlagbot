import { Context, Scenes } from 'telegraf';
import { GameLifecycle } from './lifecycle/lifecycle';
import { User } from './user';

export interface JetlagContext extends Context {
    gameLifecycle: GameLifecycle;
	scene: Scenes.SceneContextScene<JetlagContext>;
    user: User
}