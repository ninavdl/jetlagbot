import { Context, Scenes } from 'telegraf';
import { GameLifecycle } from './lifecycle/lifecycle';
import { User } from './user';
import { Bot } from './bot';

export interface JetlagContext extends Context {
    gameLifecycle: GameLifecycle;
	scene: Scenes.SceneContextScene<JetlagContext>;
    user: User,
    bot: Bot
}