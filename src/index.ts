import { Context, Schema, h } from "koishi";
import { getPifUrl, getPifUrlAll, getPokeNameByPifId, randFuse, randFuseByBody, randFuseByHead, tryParseIntoPifId } from "./utils";

export const name = "pokemon-fusion";

export interface Config {}

export const Config: Schema<Config> = Schema.object({});

export function apply(ctx: Context) {
  ctx
    .command("fuse [head] [body]", "获得某两个宝可梦的融合")
    .option("all", "-a")
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

      let status = 0;
      let url = undefined;
      if (options.all) {
        url = getPifUrlAll(headId, bodyId);
        status = 200;
      } else {
        // TODO: 支持fetch后替换或采用内部表避免不存在融合
        // 使用内部表还可以方便地支持变体
        url = getPifUrl(headId, bodyId);
        status = await ctx.http
          .get(url)
          .then((res) => {
            return 200;
          })
          .catch((e) => {
            return e.response.status;
          });
      }

      if (status === 200) {
        return h("img", { src: url });
      } else if (status === 404) {
        return `暂时没有这种融合呢。`;
      } else {
        return `出错了！`;
      }
    })
    .alias("随机融合", { args: ["0", "0"] })
    .alias("全随机融合", { args: ["0", "0"], options: { all: true } })
    .shortcut(/^锁头 (\b.*\b).*$/, { args: ["$1", "0"] })
    .shortcut(/^锁身 (\b.*\b).*$/, { args: ["0", "$1"] })
    .alias("融合")
    .usage("第一个参数代表头部，第二个参数代表身体，可以使用图鉴编号、中文名或英文名。\n输入0代表随机，参数--all代表无视人工图过滤。");
}
