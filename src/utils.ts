import { Random } from "koishi";
import { ZhName, EnName, pokeIdToPifIdMap, pifIdToPokeIdMap, PifId, PokeId, ZhNameToPokeId, EnNameToPokeId, PifIdToSpecialName, SpecialName } from "./consts";
import { PifValidMatrix, PifIdToMatrixId, MatrixIdToPifId } from "./valid_matrix";

const PifIdRegex = /[\d_]+/;

export function validCustomFusion(head: PifId, body: PifId): boolean {
  return PifValidMatrix[PifIdToMatrixId[head]][PifIdToMatrixId[body]].length > 0;
}

export function getFusionVariants(head: PifId, body: PifId): Array<string> {
  return PifValidMatrix[PifIdToMatrixId[head]][PifIdToMatrixId[body]].split(",");
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

const HeadBodyRegex = /原来是(.+?)(和.+)?！/;
const VariantRegex = /变体:\s*([a-z基础自动生成]+).*/;
export const AtRegex = /<at id="(.+)" name="(.+)"\/>/;

export function tryParseFuseMessage(message: string): [PifId , PifId | undefined, string] | null {
  let match = message.match(HeadBodyRegex);
  if (match === null || match.filter((m) => m !== undefined).length < 2) return null;

  const head: PifId = match[1];
  const body: PifId | undefined = match[2] === undefined ? undefined : match[2].slice(1);

  const headId = tryParseIntoPifId(head);
  const bodyId = tryParseIntoPifId(body);

  if (headId === null) return null;
  if (bodyId === null) return null;

  match = message.match(VariantRegex);
  if (match === null || match.filter((m) => m !== undefined).length < 2) return null;
  let variant = match[1];

  return [headId, bodyId, variant];
}

const autogenLinkRegex = /\/([\d_]+)\.([\d_]+)\.png/;
const customLinkRegex = /\/([\d_]+\.)?([\d_]+)([a-z]*)?\.png/;

export function tryParseFuseMessageByLink(message: string): [PifId, PifId | undefined, string] | null {
  let headId = undefined;
  let bodyId = undefined;
  let variant = undefined;
  if (message.includes("autogen-fusion-sprites")) {
    let match = message.match(autogenLinkRegex);
    if (match === null || match.filter((m) => m !== undefined).length < 3) return null;

    headId = match[1];
    bodyId = match[2];
  } else if (message.includes("customsprites")) {
    let match = message.match(customLinkRegex);
    if (match === null || match.filter((m) => m !== undefined).length < 3) return null;

    // original image without fusion
    if (match[1] === "") {
      headId = match[2];
      bodyId = undefined;
      variant = match[3] === undefined ? "" : match[3];
    } else {
      headId = match[1].slice(0, -1);
      bodyId = match[2];
      variant = match[3] === undefined ? "" : match[3];
    }
  } else {
    return null;
  }

  return [headId, bodyId, variant];
}

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
  return MatrixIdToPifId[Random.int(0, Object.keys(PifIdToMatrixId).length)];
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
  name = name.toLowerCase();
  if (ZhNameToPokeId[name]) return ZhNameToPokeId[name];
  else if (EnNameToPokeId[name]) return EnNameToPokeId[name];
  else return null;
}

export function tryGetPifIdFromName(name: string): PifId | null {
  name = name.toLocaleLowerCase();
  if (SpecialName[name]) return SpecialName[name];
  const pokeId = tryGetPokeIdFromName(name);
  if (pokeId === null) return null;
  return tryGetPifIdFromPokeId(pokeId);
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

export function getVariantName(variant: string): string {
  if (variant === "" || variant === " " || variant === "vanilla") return "基础";
  if (variant === "autogen") return "自动生成";
  return variant;
}

export function getValidVariant(head: PifId, body: PifId, variant?: string): string {
  const variants = PifValidMatrix[PifIdToMatrixId[head]][PifIdToMatrixId[body]].split(",");
  if (variants.indexOf(variant) === -1) variant = variants[Random.int(0, variants.length)];

  return variant;
}

export function getPifUrlAll(head: PifId, body: PifId): string {
  return `https://gitlab.com/pokemoninfinitefusion/autogen-fusion-sprites/-/raw/master/Battlers/${head}/${head}.${body}.png?ref_type=heads`;
}

export function getPifUrl(head: PifId, body?: PifId, variant?: string): string {
  if (variant === undefined) variant = "";
  variant = variant.trim();
  if (body === undefined) return `http://gitlab.com/pokemoninfinitefusion/customsprites/-/raw/master/CustomBattlers/${head}${variant}.png?ref_type=heads`;
  else return `http://gitlab.com/pokemoninfinitefusion/customsprites/-/raw/master/CustomBattlers/${head}.${body}${variant}.png?ref_type=heads`;
}
