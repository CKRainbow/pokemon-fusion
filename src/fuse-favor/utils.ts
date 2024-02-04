import { Context } from "koishi";
import { PifId } from "../consts";
import { getPokeNameByPifId, getVariantName } from "../utils";

export function displayFavorEntry(headId: PifId, bodyId: PifId, variant: string): string {
  const headName = getPokeNameByPifId(headId);
  const bodyName = getPokeNameByPifId(bodyId);
  const variantName = getVariantName(variant);

  return `${headName}-${bodyName}(${variantName}变体)`;
}

export async function getAidAsync(ctx: Context, uid: string): Promise<number | null> {
  const aidPick = await ctx.database.get("binding", { pid: uid }, ["aid"]);
  if (aidPick.length <= 0) return null;
  return aidPick[0].aid;
}
