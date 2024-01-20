import { Random, isInteger } from "koishi";
import {ZhName, EnName, pifIdMax, pokeIdToPifIdMap, pifIdToPokeIdMap} from './consts';

type PokeId = number;
type PifId = number;

// const validFuseMap: Map<PifId, Array<PifId>> = {

// }


export function tryParseIntoPifId(parsee: string | undefined): PifId | undefined | null
{
    if (parsee === undefined)
        return undefined;

    let pokeId = 0;

    if (isInteger(parseFloat(parsee))) {
        pokeId = parseInt(parsee);
    } else if (typeof parsee === "string") {
        pokeId = getPokeIdFromName(parsee);
        if (pokeId === null)
            return null;
    } else {
        return null
    }

    return tryGetPifIdFromPokeId(pokeId);
}

export function randFuse(): Array<PifId>
{
    const randHead = Random.int(1, pifIdMax);
    const randBody = Random.int(1, pifIdMax);
    return [randHead, randBody];
}

export function randFuseByHead(head: PifId): Array<PifId>
{
    const randBody = Random.int(1, pifIdMax);
    return [head, randBody];
}

export function randFuseByBody(body: PifId): Array<PifId>
{
    const randHead = Random.int(1, pifIdMax);
    return [randHead, body];
}

function getPokeIdFromName(name: string): PokeId | null
{
    name = name.toLocaleLowerCase();
    if (ZhName.indexOf(name) >= 0)
        return ZhName.indexOf(name) + 1;
    else if (EnName.indexOf(name) >= 0)
        return EnName.indexOf(name) + 1;
    else
        return null;
}

function tryGetPifIdFromPokeId(pokeId: PokeId): PifId | null
{
    if (pokeId <= -1)
        return null;
    else if (pokeId <= 251)
        // 初代和二代宝可梦Id相同
        return pokeId;
    else if (pokeIdToPifIdMap[pokeId])
        return pokeIdToPifIdMap[pokeId]
    else
        return null;
}

function tryGetPokeIdFromPifId(pifId: PifId): PokeId | null
{
    if (pifId === 0 || pifId < -1)
        return null;
    else if (pifId <= 251)
        // 初代和二代宝可梦Id相同
        return pifId;
    else if (pifIdToPokeIdMap[pifId])
        return pifIdToPokeIdMap[pifId]
    else
        return null;
}

export function getPokeNameByPifId(pifId: PifId): string
{
    const pokeId = tryGetPokeIdFromPifId(pifId);
    if (pokeId === null)
        return "Error";
    
    return getPokeNameByPokeId(pokeId);
}

export function getPokeNameByPokeId(pokeId: PokeId): string
{
    return ZhName[pokeId - 1];
}

export function getPifUrlAll(head: PifId, body: PifId): string
{
    return `https://gitlab.com/pokemoninfinitefusion/autogen-fusion-sprites/-/raw/master/Battlers/${head}/${head}.${body}.png?ref_type=heads`
}

export function getPifUrl(head: PifId, body: PifId): string
{
    return `http://gitlab.com/pokemoninfinitefusion/customsprites/-/raw/master/CustomBattlers/${head}.${body}.png?ref_type=heads`;
}