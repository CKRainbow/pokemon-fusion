import { Context, Random, h } from "koishi";
import { AtRegex, getFusionVariants, getPifUrl, getPifUrlAll, getPokeNameByPifId, tryParseFuseMessageByLink, tryParseIntoPifId } from "../utils";
import { PifId } from "../consts";
import { displayFavorEntry, getAidAsync } from "./utils";

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
  user: number;
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
      user: "unsigned",
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
      let [headId, bodyId, variant] = [undefined, undefined, undefined];

      if (argv.source.includes("autogen")) autogen = true;

      if (head === undefined || body === undefined) {
        const result = tryParseFuseMessageByLink(argv.source);
        if (result === null) {
          return `你都喜欢了些什么啊！`;
        }
        [headId, bodyId, variant] = result;
      } else {
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
        await session.send(`从该融合的以下变体中选一个吧: \n${variants.join(",").replace(" ", "基础")}`);
        const result = await session.prompt(
          async (session) => {
            return session.event.message.elements[0].attrs.content;
          },
          { timeout: 10000 }
        );
        if (result === undefined) return `看来你还没有决定好呢。`;
        variant = result;
      }
      variant = variant === "" || variant === "基础" ? " " : variant;

      // FIXME: 会出现无对应融合的问题？

      if (variants.indexOf(variant) === -1 && !autogen) return `暂时还没有这种融合呢。`;

      if (variant == " ") variant = "vanilla";

      const uid = session.event.user.id;
      const uname = session.event.user.name;
      // const uname = session.username;
      const aid = await getAidAsync(ctx, uid);

      const id = await ctx.database.get("fuseFavor", {
        head: headId,
        body: bodyId,
        variant: variant,
        user: aid,
      });

      if (id.length > 0) {
        return `${uname}已经在喜欢了！`;
      }

      await ctx.database.create("fuseFavor", {
        head: headId,
        body: bodyId,
        variant: variant,
        user: aid,
      });

      // FIXME: uname为空？

      return `原来${uname}喜欢${displayFavorEntry(headId, bodyId, variant)}！`;
    })
    .alias("喜欢")
    .alias("喜欢这个");

  ctx
    .command("unlikef <head> <body>", "将该融合从喜欢列表中删除")
    .option("variant", "-v [variant] 指定变体，仅在非引用回复时有效", { type: /^[a-z]*$/ })
    .action(async (argv, head, body) => {
      if (argv.args.length < 1) return ``;

      const session = argv.session;

      const headId = tryParseIntoPifId(head);
      const bodyId = tryParseIntoPifId(body);

      if (headId === null) {
        return `尚不支持该头部宝可梦`;
      } else if (bodyId === null) {
        return `尚不支持该身体宝可梦`;
      }

      let variant = argv.options.variant;
      const uid = session.event.user.id;
      const uname = session.event.user.name;

      const aid = await getAidAsync(ctx, uid);

      const variants = await ctx.database.get("fuseFavor", {
        head: headId,
        body: bodyId,
        user: aid,
      });

      if (variant === undefined && variants.length > 1) {
        await session.send(`从该融合的以下变体中选一个吧: \n${variants.join(",").replace(" ", "基础")}`);
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

      return `${uname}已经不喜欢${displayFavorEntry(headId, bodyId, variant)}了吗？`;
    });

  ctx.command("showff", "显示喜欢列表").action(async (argv) => {
    const match = argv.source.match(AtRegex);

    let uid = "";
    let uname = "";

    if (match !== null) {
      uid = match[1];
      uname = match[2];
    } else {
      uid = argv.session.event.user.id;
      uname = argv.session.event.user.name;
    }
    const aid = await getAidAsync(ctx, uid);
    if (aid === null) return `${uname}还没有注册哦，无法显示喜欢的融合。`;

    const list = await ctx.database.get("fuseFavor", {
      user: aid,
    });

    if (list.length === 0) {
      return `${uname}还没有喜欢的融合哦。`;
    }

    const rand = Random.int(0, 10);

    if (rand >= 2) {
      return `${uname}喜欢这些融合: ` + h("br") + `${list.map((v) => displayFavorEntry(v.head, v.body, v.variant)).join(",\n")}`;
    } else if (rand < 2) {
      const favorDict: { [key: string]: number } = {};
      list.forEach((entry) => {
        favorDict[entry.head] = (favorDict[entry.head] ?? 0) + 1;
        favorDict[entry.body] = (favorDict[entry.body] ?? 0) + 1;
      });
      let favorate: string = "";
      let max: number = 0;
      Object.entries(favorDict).forEach(([k, v]) => {
        if (v > max) {
          favorate = k;
          max = v;
        }
      });
      return `${uname}最喜欢的宝可梦应该是${getPokeNameByPifId(favorate)}吧！`;
    }

    return `${uname}很喜欢这些融合: \n` + `${list.map((v) => displayFavorEntry(v.head, v.body, v.variant)).join(",\n")}`;
  });

  ctx.command("randff", "随机显示喜欢的融合").action(async (argv) => {
    const match = argv.source.match(AtRegex);

    let uid = "";
    let uname = "";

    if (match !== null) {
      uid = match[1];
      uname = match[2];
    } else {
      uid = argv.session.event.user.id;
      uname = argv.session.event.user.name;
    }
    const aid = await getAidAsync(ctx, uid);

    if (aid === null) return `${uname}还没有注册哦，无法随机显示喜欢的融合。`;

    const list = await ctx.database.get("fuseFavor", {
      user: aid,
    });

    if (list.length === 0) {
      return `${uname}还没有喜欢的融合哦。`;
    }

    const target = list[Random.int(0, list.length)];

    if (target.variant === "vanilla") target.variant = "";

    let url = null;
    if (target.variant === "autogen") {
      url = getPifUrlAll(target.head, target.body);
    } else {
      url = getPifUrl(target.head, target.body, target.variant);
    }

    return `${uname}很喜欢${displayFavorEntry(target.head, target.body, target.variant)}！\n` + h("img", { src: url });
  });
}
