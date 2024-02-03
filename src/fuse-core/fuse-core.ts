import { Context, h } from "koishi";
import {
  getPifUrl,
  getPifUrlAll,
  getPokeNameByPifId,
  getValidVariant,
  randFuse,
  randFuseAll,
  randFuseByBody,
  randFuseByHead,
  tryGetPokeIdFromName,
  tryParseIntoPifId,
  validCustomFusion,
} from "../utils";

export interface FuseCoreConfig {}

export const name = "fuse-core";

export function apply(ctx: Context, config: FuseCoreConfig) {
  ctx
    .command("fuse [head] [body]", "获得某两个宝可梦的融合")
    .option("all", "-a 无视人工图要求")
    .option("variant", "-v [variant] 指定变体", { type: /^[a-z]*$/ })
    // TODO: 指定未融合图
    .action((argv, head, body) => {
      const options = argv.options;

      let headId = tryParseIntoPifId(head);
      let bodyId = tryParseIntoPifId(body);

      if (headId === null) {
        return `尚不支持该头部宝可梦`;
      } else if (bodyId === null) {
        return `尚不支持该身体宝可梦`;
      }

      if (options.all) {
        if (headId === undefined) headId = randFuseAll();
        if (bodyId === undefined) bodyId = randFuseAll();
      }

      if (headId === undefined && bodyId === undefined) {
        [headId, bodyId] = randFuse();
      } else if (bodyId == undefined) {
        [headId, bodyId] = randFuseByHead(headId);
      } else if (headId === undefined) {
        [headId, bodyId] = randFuseByBody(bodyId);
      }

      let variant = argv.options.variant;
      let infoMessage = "";
      if (variant === "") variant = " ";

      let url = "";
      if (validCustomFusion(headId, bodyId)) {
        const validVariant = getValidVariant(headId, bodyId, variant);
        const selectedVariantName = validVariant === " " ? "基础" : validVariant;
        if (variant !== validVariant && variant !== undefined) {
          infoMessage += `该融合并没有变体${variant}，故随机选择了变体: ${selectedVariantName}\n`;
          variant = validVariant;
        } else {
          variant = validVariant;
          infoMessage += `选择了变体: ${selectedVariantName}\n`;
        }

        url = getPifUrl(headId, bodyId, variant);
      } else if (options.all) {
        url = getPifUrlAll(headId, bodyId);
        infoMessage += `选择了变体: 自动生成\n`;
      } else {
        return `暂时还没有这种融合呢。`;
      }

      return `要融合的宝可梦原来是${getPokeNameByPifId(headId)}和${getPokeNameByPifId(bodyId)}！\n` + infoMessage + h("img", { src: url });
    })
    .alias("随机融合", { args: ["0", "0"] })
    .shortcut(/^锁头 (\S*)\s*$/, { args: ["$1", "0"] })
    .shortcut(/^锁身 (\S*)\s*$/, { args: ["0", "$1"] })
    .alias("融合")
    .usage("第一个参数代表头部，第二个参数代表身体，可以使用图鉴编号、中文名或英文名。");

  ctx
    .command("pid <name>", "查询宝可梦的全国图鉴Id")
    .action((_, name) => {
      const pokeId = tryGetPokeIdFromName(name);

      if (pokeId === null) return `好像没有找到${name}这只宝可梦。`;

      return `${name}的全国图鉴Id是${pokeId}哦。`;
    })
    .alias("图鉴");
}
