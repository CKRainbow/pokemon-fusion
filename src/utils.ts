import { Random } from "koishi";
import { ZhName, EnName, pokeIdToPifIdMap, pifIdToPokeIdMap, PifId, PokeId, ZhNameToPokeId, EnNameToPokeId, PifIdToSpecialName, SpecialName } from "./consts";
import { PifValidMatrix, PifIdToMatrixId, MatrixIdToPifId } from "./valid_matrix";

const PifIdRegex = /[\d_]+/;

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

const HeadBodyRegex = /原来是(.+?)(和.+)?！/;
const VariantRegex = /变体:\s*([a-z基础自动生成]+).*/;
const FavorDisplayRegex = /(.+)-(.+)\((.+)变体\)/;
export const AtRegex = /<at id="(.+)" name="(.+)"\/>/;

export function tryParseFuseMessage(message: string): [PifId, PifId | undefined, string] | null {
  let match = message.match(FavorDisplayRegex);
  if (match !== null && match.filter((m) => m !== undefined).length === 4) return [match[1], match[2], match[3]];

  match = message.match(HeadBodyRegex);
  if (match === null || match.filter((m) => m !== undefined).length < 2) return null;

  const head: PifId = match[1];
  const body: PifId | undefined = match[2] === undefined ? undefined : match[2].slice(1);

  const headId = tryParseIntoPifId(head);
  const bodyId = tryParseIntoPifId(body);

  if (headId === null) return null;
  if (bodyId === null) return null;

  match = message.match(VariantRegex);
  if (match === null || match.filter((m) => m !== undefined).length < 2) return null;
  const variant = match[1];

  return [headId, bodyId, variant];
}

const autogenLinkRegex = /\/([\d_]+)\.([\d_]+)\.png/;
const customLinkRegex = /\/([\d_]+\.)?([\d_]+)([a-z]*)?\.png/;

export function tryParseFuseMessageByLink(message: string): [PifId, PifId | undefined, string] | null {
  let headId = undefined;
  let bodyId = undefined;
  let variant = undefined;
  if (message.includes("autogen-fusion-sprites")) {
    const match = message.match(autogenLinkRegex);
    if (match === null || match.filter((m) => m !== undefined).length < 3) return null;

    headId = match[1];
    bodyId = match[2];
  } else if (message.includes("customsprites")) {
    const match = message.match(customLinkRegex);
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

export function getVariantName(variant: string): string {
  if (variant === "" || variant === " " || variant === "vanilla") return "基础";
  if (variant === "autogen") return "自动生成";
  return variant;
}

export function getValidVariant(head: PifId, body: PifId, variant?: string): string {
  const variants = PifValidMatrix[PifIdToMatrixId[head]][PifIdToMatrixId[body]].split(",");
  if (variants.indexOf(variant) === -1) return Random.pick(variants);

  return variant;
}

export function getPifUrlAll(head: PifId, body: PifId): string {
  return `https://gitlab.com/pokemoninfinitefusion/autogen-fusion-sprites/-/raw/master/Battlers/${head}/${head}.${body}.png?ref_type=heads`;
}

export function getPifUrl(head: PifId, body: PifId, _variant?: string): string {
  let variant = _variant;
  if (variant === undefined) variant = "";
  variant = variant.trim();
  return `http://gitlab.com/pokemoninfinitefusion/customsprites/-/raw/master/CustomBattlers/${head}.${body}${variant}.png?ref_type=heads`;
}

export function getPifUrlTri(first: PifId, second: PifId, third: PifId, _variant?: string): string {
  let variant = _variant;
  if (variant === undefined) variant = "";
  variant = variant.trim();
  return `http://gitlab.com/pokemoninfinitefusion/customsprites/-/raw/master/Other/Triples/${first}.${second}.${third}${variant}.png?ref_type=heads`;
}

export function getPifUrlBase(base: PifId, _variant?: string): string {
  let variant = _variant;
  if (variant === undefined) variant = "";
  variant = variant.trim();
  return `http://gitlab.com/pokemoninfinitefusion/customsprites/-/raw/master/Other/BaseSprites/${base}${variant}.png?ref_type=heads`;
}
