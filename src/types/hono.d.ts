import { Context } from "hono";
import { BlankEnv, BlankInput } from "hono/types";

export type HonoContext = Context<BlankEnv, "/", any> | Context<BlankEnv, "/", BlankInput>