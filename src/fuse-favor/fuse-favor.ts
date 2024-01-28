import { Context, Random, h } from "koishi";
import { getFusionVariants, getPifUrl, getPifUrlAll, getPokeNameByPifId, tryParseFuseMessage, tryParseIntoPifId } from "../utils";
import { PifId } from "../consts";

declare module "koishi" {
  interface Tables {
    fuseFavor: FuseFavor;
  }
}

interface FuseFavor {
  id: number;
  head: PifId;
  body: PifId;
  variant: string;
  user: string;
}

export interface FuseFavorConfig {}

export const name = "fuse-favor";
export const inject = ["database"];

export function apply(ctx: Context, config: FuseFavorConfig) {
  ctx.model.extend(
    "fuseFavor",
    {
      id: "unsigned",
      head: "string",
      body: "string",
      variant: "string",
      user: "string",
    },
    {
      autoInc: true,
      foreign: {
        user: ["user", "id"],
      },
    }
  );

  ctx
    .command("likef [head] [body]", "将该融合加入喜欢列表")
    .option("variant", "-v [variant] 指定变体，仅在非引用回复时有效", { type: /^[a-z]*$/ })
    .action(async (argv, head, body) => {
      if (argv.args.length < 1) return ``;

      const session = argv.session;
      let autogen = false;

      if (argv.source.includes("autogen")) autogen = true;

      let [headId, bodyId, variant] = tryParseFuseMessage(argv.source);

      if (headId === null || bodyId === null) {
        if (head == undefined) return `请指定头部宝可梦`;
        if (body == undefined) return `请指定身体宝可梦`;

        headId = tryParseIntoPifId(head);
        bodyId = tryParseIntoPifId(body);

        if (headId === null) {
          return `尚不支持该头部宝可梦`;
        } else if (bodyId === null) {
          return `尚不支持该身体宝可梦`;
        }
      }

      if (autogen) variant = "autogen";
      else if (variant === null) variant = argv.options.variant;
      const variants = getFusionVariants(headId, bodyId);
      if (variant === undefined) {
        await session.send(`从该融合的以下变体中选一个吧:\n${variants.join(",").replace(" ", "基础")}`);
        const result = await session.prompt(
          async (session) => {
            return session.event.message.elements[0].attrs.content;
          },
          { timeout: 6000 }
        );
        if (result === undefined) return `看来你还没有决定好呢。`;
        variant = result;
      }
      variant = variant === "" || variant === "基础" ? " " : variant;

      if (variants.indexOf(variant) === -1 && !autogen) return `暂时还没有这种融合呢。`;

      if (variant == " ") variant = "vanilla";

      // const uid = session.userId;
      const uid = session.user.id;

      const id = await ctx.database.get("fuseFavor", {
        head: headId,
        body: bodyId,
        variant: variant,
        user: uid,
      });

      if (id.length > 0) {
        return `${uid} 已经在喜欢了！`;
      }

      await ctx.database.create("fuseFavor", {
        head: headId,
        body: bodyId,
        variant: variant,
        user: uid,
      });

      return `${headId} ${bodyId} ${variant} 融合已经加入 ${uid} 的喜欢列表`;
    })
    .alias("喜欢")
    .alias("喜欢这个");

  ctx
    .command("unlikef [head] [body]", "将该融合从喜欢列表中删除")
    .option("variant", "-v [variant] 指定变体，仅在非引用回复时有效", { type: /^[a-z]*$/ })
    .action(async (argv, head, body) => {
      if (argv.args.length < 1) return ``;

      const session = argv.session;

      if (head == undefined) return `请指定头部宝可梦`;
      if (body == undefined) return `请指定身体宝可梦`;

      const headId = tryParseIntoPifId(head);
      const bodyId = tryParseIntoPifId(body);

      if (headId === null) {
        return `尚不支持该头部宝可梦`;
      } else if (bodyId === null) {
        return `尚不支持该身体宝可梦`;
      }

      let variant = argv.options.variant;
      // const uid = session.userId;
      const uid = session.user.id;

      const variants = await ctx.database.get("fuseFavor", {
        head: headId,
        body: bodyId,
        user: uid,
      });

      if (variant === undefined && variants.length > 1) {
        await session.send(`从该融合的以下变体中选一个吧:\n${variants.join(",").replace(" ", "基础")}`);
        const result = await session.prompt(
          async (session) => {
            return session.event.message.elements[0].attrs.content;
          },
          { timeout: 6000 }
        );
        if (result === undefined) return `看来你还没有决定好呢。`;

        const target = variants.filter((v) => v.variant === result);
        if (target.length === 0) return `好像并没有喜欢${result}这个变体呢。`;

        await ctx.database.remove("fuseFavor", [target[0].id]);
      } else if (variant === undefined && variants.length === 1) {
        await ctx.database.remove("fuseFavor", [variants[0].id]);
      } else {
        const target = variants.filter((v) => v.variant === variant);
        if (target.length === 0) return `好像并没有喜欢${variant}这个变体呢。`;

        await ctx.database.remove("fuseFavor", [target[0].id]);
      }

      return `${headId} ${bodyId} ${variant} 融合已经从 ${uid} 的喜欢列表移除了`;
    });

  ctx.command("showff", "显示喜欢列表").action(async (argv) => {
    // const uid = argv.session.userId;
    const uid = argv.session.user.id;
    const list = await ctx.database.get("fuseFavor", {
      user: uid,
    });
    return (
      `${uid}很喜欢这些融合:\n` +
      `${list
        .map((v) => {
          const headName = getPokeNameByPifId(v.head);
          const bodyName = getPokeNameByPifId(v.body);
          return `${headName}-${bodyName}(${v.variant}变体)`;
        })
        .join(",\n")}`
    );
  });

  ctx.command("randff", "随机显示喜欢的融合").action(async (argv) => {
    // TODO: extract id from <at/>
    const uid = argv.session.user.id;
    const list = await ctx.database.get("fuseFavor", {
      user: uid,
    });

    if (list.length === 0) {
      return "你还没有喜欢的融合哦";
    }

    const target = list[Random.int(0, list.length)];
    const headName = getPokeNameByPifId(target.head);
    const bodyName = getPokeNameByPifId(target.body);

    if (target.variant === "vanilla") target.variant = "";

    let url = null;
    if (target.variant === "autogen") {
      url = getPifUrlAll(target.head, target.body);
    } else {
      url = getPifUrl(target.head, target.body, target.variant);
    }

    return `${headName}-${bodyName}(${target.variant}变体)\n` + h("img", { src: url });
  });
}
