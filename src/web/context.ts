import * as Koa from "koa";
import { GameLifecycle } from "../lifecycle/lifecycle";

export interface WebContext {
    gameLifecycle: GameLifecycle
}