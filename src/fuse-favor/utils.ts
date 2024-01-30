import { PifId } from "../consts";
import { getPokeNameByPifId, getVariantName } from "../utils";

export function displayFavorEntry(headId: PifId, bodyId: PifId, variant: string): string {
  const headName = getPokeNameByPifId(headId);
  const bodyName = getPokeNameByPifId(bodyId);
  const variantName = getVariantName(variant);

  return `${headName}-${bodyName}(${variantName}变体)`;
}
