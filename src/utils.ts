import { Random } from "koishi";
import { ZhName, EnName, pokeIdToPifIdMap, pifIdToPokeIdMap, PifId, PokeId, ZhNameToPokeId, EnNameToPokeId, PifIdToSpecialName, SpecialName } from "./consts";
import { PifValidMatrix, PifIdToMatrixId, MatrixIdToPifId } from "./valid_matrix";

const PifIdRegex = /[\d_]+/;

export function validCustomFusion(head: PifId, body: PifId): boolean {
  return PifValidMatrix[PifIdToMatrixId[head]][PifIdToMatrixId[body]].length > 0;
}

export function tryParseIntoPifId(parsee: string | undefined): PifId | undefined | null {
  if (parsee === undefined || parsee === "0") return undefined;

  if (!isNaN(Number(parsee))) {
    return tryGetPifIdFromPokeId(parseInt(parsee));
  } else if (typeof parsee === "string") {
    const pifId = tryGetPifIdFromName(parsee);
    return pifId;
  } else {
    return null;
  }
}

export function randFuse(): Array<PifId> {
  const randHeadMatrixId = Random.int(0, Object.keys(PifIdToMatrixId).length);
  const randHead = MatrixIdToPifId[randHeadMatrixId];
  const headLock = PifValidMatrix[randHeadMatrixId];
  const validSelection: Array<number> = [];
  headLock.forEach((variants,index) => {
    if (variants.length > 0)
      validSelection.push(index);
  });
  const randBody = MatrixIdToPifId[validSelection[Random.int(0, validSelection.length)]];
  
  return [randHead, randBody];
}

export function randFuseByHead(head: PifId): Array<PifId> {
  const headLock = PifValidMatrix[PifIdToMatrixId[head]];
  const validSelection: Array<number> = [];
  headLock.forEach((variants,index) => {
    if (variants.length > 0)
      validSelection.push(index);
  });
  const randBody = MatrixIdToPifId[validSelection[Random.int(0, validSelection.length)]];
  return [head, randBody];
}

export function randFuseByBody(body: PifId): Array<PifId> {
  const validSelection: Array<number> = [];
  const bodyMatrixId = PifIdToMatrixId[body];
  PifValidMatrix.forEach((bodysVariants, index) => {
    if (bodysVariants[bodyMatrixId].length > 0)
      validSelection.push(index);
  });
  const randHead = MatrixIdToPifId[validSelection[Random.int(0, validSelection.length)]];
  return [randHead, body];
}

export function tryGetPokeIdFromName(name: string): PokeId | null {
  name = name.toLocaleLowerCase();
  if (ZhNameToPokeId[name]) return ZhNameToPokeId[name];
  else if (EnNameToPokeId[name]) return EnNameToPokeId[name];
  else return null;
}

export function tryGetPifIdFromName(name: string): PifId | null {
  name = name.toLocaleLowerCase();
  if (SpecialName[name]) return SpecialName[name];
  return tryGetPifIdFromPokeId(tryGetPokeIdFromName(name));
}

function tryGetPifIdFromPokeId(pokeId: PokeId): PifId | null {
  if (pokeId <= -1) return null;
  else if (pokeId <= 251) return pokeId.toString(); // 初代和二代宝可梦Id相同
  else if (pokeIdToPifIdMap[pokeId]) {
    const pifIds = pokeIdToPifIdMap[pokeId];
    if (pifIds instanceof Array) {
      return pifIds[Random.int(pifIds.length)];
    } else {
      return pifIds;
    }
  } else return null;
}

function tryGetPokeIdFromPifId(pifId: PifId): PokeId | null {
  const pifIdInt = parseInt(pifId);
  if (pifIdInt === 0 || pifIdInt < -1) return null;
  else if (pifIdInt <= 251) return pifIdInt; // 初代和二代宝可梦Id相同
  else if (pifIdToPokeIdMap[pifId]) return pifIdToPokeIdMap[pifId];
  else return null;
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

export function getPifUrlAll(head: PifId, body: PifId): string {
  return `https://gitlab.com/pokemoninfinitefusion/autogen-fusion-sprites/-/raw/master/Battlers/${head}/${head}.${body}.png?ref_type=heads`;
}

export function getPifUrl(head: PifId, body: PifId): string {
  const variants = PifValidMatrix[PifIdToMatrixId[head]][PifIdToMatrixId[body]].split(",");
  let variant = variants[Random.int(0, variants.length)].trim();
  return `http://gitlab.com/pokemoninfinitefusion/customsprites/-/raw/master/CustomBattlers/${head}.${body}${variant}.png?ref_type=heads`;
}
