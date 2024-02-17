import { Context } from "koishi";

export async function getAidAsync(ctx: Context, uid: string): Promise<number | null> {
  const aidPick = await ctx.database.get("binding", { pid: uid }, ["aid"]);
  if (aidPick.length <= 0) return null;
  return aidPick[0].aid;
}
