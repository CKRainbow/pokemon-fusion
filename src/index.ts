import { Context, Schema } from "koishi";

import * as FuseCore from "./fuse-core/fuse-core";
import * as FuseFavor from "./fuse-favor/fuse-favor";

export const name = "pokemon-fusion";

export interface Config {}

export const Config: Schema<Config> = Schema.object({});

export function apply(ctx: Context) {
  ctx.plugin(FuseCore);
  ctx.plugin(FuseFavor);
}
