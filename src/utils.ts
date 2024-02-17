import { Random } from "koishi";
import { ZhName, EnName, pokeIdToPifIdMap, pifIdToPokeIdMap, PifId, PokeId, ZhNameToPokeId, EnNameToPokeId, PifIdToSpecialName, SpecialName } from "./consts";
import { PifValidMatrix, PifIdToMatrixId, MatrixIdToPifId, BaseValidList, TriValidList } from "./valid_matrix";

export type FuseEntry = {
  firstId: PifId;
  secondId?: PifId;
  thirdId?: PifId;
  variant?: string;
};

export function validCustomFusion(head: PifId, body: PifId): boolean {
  const variants = PifValidMatrix[PifIdToMatrixId[head]][PifIdToMatrixId[body]];
  if (variants === undefined) return false;
  return variants.length > 0;
}

export function getFusionVariants(head: PifId, body: PifId): Array<string> {
  return PifValidMatrix[PifIdToMatrixId[head]][PifIdToMatrixId[body]].split(",");
}

export function tryParseIntoPifId(parsee: string | undefined): PifId | undefined | null {
  if (parsee === undefined || parsee === "0") return undefined;

  if (!Number.isNaN(Number(parsee))) {
    return tryGetPifIdFromPokeId(parseInt(parsee));
  } else if (typeof parsee === "string") {
    const pifId = tryGetPifIdFromName(parsee);
    return pifId;
  } else {
    return null;
  }
}

const FavorDisplayRegex = /\[(.+?)\]\((.+)变体\)/;
export const AtRegex = /<at id="(.+)" name="(.+)"\/>/;

export function tryParseFuseMessage(message: string): [PifId, PifId | undefined, PifId | undefined, string] | null {
  let match = message.match(FavorDisplayRegex);
  if (match === null) return null;
  const pokes = match[1].split("-");
  if (pokes.length === 1) return [tryParseIntoPifId(pokes[0]), undefined, undefined, match[2]];
  else if (pokes.length === 2) return [tryParseIntoPifId(pokes[0]), tryParseIntoPifId(pokes[1]), undefined, match[2]];
  else if (pokes.length === 3) return [tryParseIntoPifId(pokes[0]), tryParseIntoPifId(pokes[1]), tryParseIntoPifId(pokes[2]), match[2]];
  else return null;
}

// REFACTOR: 使其更加通用
export function randFuse(): Array<PifId> {
  const randHeadMatrixId = Random.int(0, Object.keys(PifIdToMatrixId).length);
  const randHead = MatrixIdToPifId[randHeadMatrixId];
  const headLock = PifValidMatrix[randHeadMatrixId];
  const validSelection: Array<number> = [];
  headLock.forEach((variants, index) => {
    if (variants.length > 0) validSelection.push(index);
  });
  const randBody = MatrixIdToPifId[validSelection[Random.int(0, validSelection.length)]];

  return [randHead, randBody];
}

export function randFuseByHead(head: PifId): Array<PifId> {
  const headLock = PifValidMatrix[PifIdToMatrixId[head]];
  const validSelection: Array<number> = [];
  headLock.forEach((variants, index) => {
    if (variants.length > 0) validSelection.push(index);
  });
  const randBody = MatrixIdToPifId[validSelection[Random.int(0, validSelection.length)]];
  return [head, randBody];
}

export function randFuseAll(): PifId {
  return Random.pick(Object.keys(PifIdToMatrixId));
}

export function randFuseByBody(body: PifId): Array<PifId> {
  const validSelection: Array<number> = [];
  const bodyMatrixId = PifIdToMatrixId[body];
  PifValidMatrix.forEach((bodysVariants, index) => {
    if (bodysVariants[bodyMatrixId].length > 0) validSelection.push(index);
  });
  const randHead = MatrixIdToPifId[validSelection[Random.int(0, validSelection.length)]];
  return [randHead, body];
}

export function tryGetPokeIdFromName(name: string): PokeId | null {
  const key = name.toLowerCase();
  if (ZhNameToPokeId[key]) return ZhNameToPokeId[key];
  else if (EnNameToPokeId[key]) return EnNameToPokeId[key];
  else return null;
}

export function tryGetPifIdFromName(name: string): PifId | null {
  const key = name.toLowerCase();
  if (SpecialName[key]) return SpecialName[key];
  const pokeId = tryGetPokeIdFromName(key);
  if (pokeId === null) return null;
  return tryGetPifIdFromPokeId(pokeId);
}

function tryGetPifIdFromPokeId(pokeId: PokeId): PifId | null {
  if (pokeId <= -1) return null;
  else if (pokeId <= 251) return pokeId.toString(); // 初代和二代宝可梦Id相同
  else if (pokeIdToPifIdMap[pokeId]) {
    const pifIds = pokeIdToPifIdMap[pokeId];
    if (Array.isArray(pifIds)) {
      return Random.pick(pifIds);
    }
    return pifIds;
  }
  return null;
}

function tryGetPokeIdFromPifId(pifId: PifId): PokeId | null {
  const pifIdInt = parseInt(pifId);
  if (pifIdInt === 0 || pifIdInt < -1) return null;
  else if (pifIdInt <= 251) return pifIdInt; // 初代和二代宝可梦Id相同
  else if (pifIdToPokeIdMap[pifId]) return pifIdToPokeIdMap[pifId];
  return null;
}

export function getPokeNameByPifId(pifId: PifId): string {
  if (PifIdToSpecialName[pifId]) return PifIdToSpecialName[pifId];

  const pokeId = tryGetPokeIdFromPifId(pifId);
  if (pokeId === null) return "Error";

  return getPokeNameByPokeId(pokeId);
}

export function getPokeNameByPokeId(pokeId: PokeId): string {
  return ZhName[pokeId - 1];
}

export function getVariantName(variant: string | undefined): string {
  if (variant === "" || variant === " " || variant === "vanilla" || variant === undefined) return "基础";
  if (variant === "autogen") return "自动生成";
  return variant;
}

export function getVariantsList(firstId: PifId, secondId?: PifId, thirdId?: PifId): string {
  if (secondId === undefined || secondId === null) return BaseValidList[PifIdToMatrixId[firstId]];
  else if (thirdId === undefined || thirdId === null) return PifValidMatrix[PifIdToMatrixId[firstId]][PifIdToMatrixId[secondId]];
  else return TriValidList[`${firstId}.${secondId}.${thirdId}`];
}

export function getValidVariant({ firstId, secondId, thirdId, variant }: FuseEntry): string {
  let variants = getVariantsList(firstId, secondId, thirdId);
  if (variants.indexOf(variant) === -1) return Random.pick(variants.split(","));

  return variant;
}

export function displayFuseEntry({ firstId, secondId, thirdId, variant }: FuseEntry): string {
  const variantName = getVariantName(variant);

  const firstName = getPokeNameByPifId(firstId);
  if (secondId === undefined || secondId === null) return `[${firstName}](${variantName}变体)`;
  const secondName = getPokeNameByPifId(secondId);
  if (thirdId === undefined || thirdId === null) return `[${firstName}-${secondName}](${variantName}变体)`;
  const thirdName = getPokeNameByPifId(thirdId);
  return `[${firstName}-${secondName}-${thirdName}](${variantName}变体)`;
}

export function getPifUrl({ firstId, secondId, thirdId, variant }: FuseEntry): string {
  if (variant === undefined) variant = "";
  variant = variant.trim();
  if (variant === "autogen")
    return `https://gitlab.com/pokemoninfinitefusion/autogen-fusion-sprites/-/raw/master/Battlers/${firstId}/${firstId}.${secondId}.png?ref_type=heads`;
  if (secondId === undefined || secondId === null)
    return `http://gitlab.com/pokemoninfinitefusion/customsprites/-/raw/master/Other/BaseSprites/${firstId}${variant}.png?ref_type=heads`;
  if (thirdId === undefined || thirdId === null)
    return `http://gitlab.com/pokemoninfinitefusion/customsprites/-/raw/master/CustomBattlers/${firstId}.${secondId}${variant}.png?ref_type=heads`;
  return `http://gitlab.com/pokemoninfinitefusion/customsprites/-/raw/master/Other/Triples/${firstId}.${secondId}.${thirdId}${variant}.png?ref_type=heads`;
}
