import { Context, Schema, h } from "koishi";
import { getPifUrl, getPifUrlAll, getPokeNameByPifId, randFuse, randFuseByBody, randFuseByHead, tryGetPokeIdFromName, tryParseIntoPifId, validCustomFusion} from "./utils";

export const name = "pokemon-fusion";

export interface Config {}

export const Config: Schema<Config> = Schema.object({});

export function apply(ctx: Context) {
  ctx
    .command("fuse [head] [body]", "获得某两个宝可梦的融合")
    .option("all", "-a")
    .option("variant", "-v <variant:integer>")
    .action(async (argv, head, body) => {
      const options = argv.options;

      let headId = tryParseIntoPifId(head);
      let bodyId = tryParseIntoPifId(body);

      if (headId === null) {
        return `尚不支持该头部宝可梦`;
      } else if (bodyId === null) {
        return `尚不支持该身体宝可梦`;
      }

      if (headId === undefined && bodyId === undefined) {
        [headId, bodyId] = randFuse();
      } else if (bodyId == undefined) {
        [headId, bodyId] = randFuseByHead(headId);
      } else if (headId === undefined) {
        [headId, bodyId] = randFuseByBody(bodyId);
      }

      argv.session.send(`要融合的宝可梦原来是${getPokeNameByPifId(headId)}和${getPokeNameByPifId(bodyId)}！`);

      let url = "";
      if (validCustomFusion(headId, bodyId)) {
        url = getPifUrl(headId, bodyId);
      } else if (options.all) {
        url = getPifUrlAll(headId, bodyId);
      } else {
        return `暂时还没有这种融合呢。`
      }

      return h("img", { src: url });
    })
    .alias("随机融合", { args: ["0", "0"] })
    .shortcut(/^锁头 (\S*)\s*$/, { args: ["$1", "0"] })
    .shortcut(/^锁身 (\S*)\s*$/, { args: ["0", "$1"] })
    .alias("融合")
    .usage("第一个参数代表头部，第二个参数代表身体，可以使用图鉴编号、中文名或英文名。\n输入0代表随机，参数--all代表无视人工图过滤。");

  ctx.command("pid <name>", "查询宝可梦的全国图鉴Id").action((argv, name) => {
    const pokeId = tryGetPokeIdFromName(name);

    if (pokeId === null) return `好像没有找到${name}这只宝可梦。`;

    return `${name}的全国图鉴Id是${pokeId}哦。`;
  });
}
