import { Context, Random, h } from "koishi";
import {
  displayFuseEntry,
  AtRegex,
  getFusionVariants,
  getPifUrl,
  getPokeNameByPifId,
  tryParseFuseMessage,
  tryParseIntoPifId,
  getVariantsList,
  FuseEntry,
} from "../utils";
import { PifId } from "../consts";
import { getAidAsync, showFavorList } from "./utils";

declare module "koishi" {
  interface Tables {
    fuseFavor: FuseFavor;
  }
}

export interface FuseFavor {
  id: number;
  firstId: PifId;
  secondId: PifId;
  thirdId: PifId;
  variant: string;
  user: number;
  nickname: string;
}

export interface FuseFavorConfig {}

export const name = "fuse-favor";
export const inject = ["database"];

export function apply(ctx: Context, config: FuseFavorConfig) {
  // FIXME: 仍无法直接迁移
  ctx.model.extend(
    "fuseFavor",
    {
      id: "unsigned",
      firstId: {
        type: "string",
        legacy: ["head"],
      },
      secondId: {
        type: "string",
        legacy: ["body"],
        nullable: true,
      },
      thirdId: {
        type: "string",
        nullable: true,
      },
      variant: "string",
      user: "unsigned",
      nickname: {
        type: "string",
        nullable: true,
      },
    },
    {
      autoInc: true,
      unique: ["nickname"],
      foreign: {
        user: ["user", "id"],
      },
    }
  );

  ctx
    .command("likef [first] [second] [third]", "将该融合加入喜欢列表")
    .option("variant", "-v [variant] 指定变体，仅在非引用回复时有效", { type: /^[a-z]*$/ })
    .action(async (argv, first, second, third) => {
      if (argv.args.length < 1) return;

      const session = argv.session;
      let autogen = false;
      let [firstId, secondId, thirdId, variant] = [undefined, undefined, undefined, undefined];

      if (argv.source.includes("autogen")) autogen = true;

      if (first === undefined || second === undefined || third === undefined) {
        const result = tryParseFuseMessage(argv.source);
        if (result === null) {
          return;
        }
        [firstId, secondId, thirdId, variant] = result;
      } else {
        firstId = tryParseIntoPifId(first);
        secondId = tryParseIntoPifId(second);
        thirdId = tryParseIntoPifId(third);

        if (firstId === null) {
          return "尚不支持宝可梦: " + first;
        } else if (secondId === null) {
          return "尚不支持宝可梦: " + second;
        } else if (thirdId === null) {
          return "尚不支持宝可梦: " + third;
        }
      }

      if (variant === "自动生成") autogen = true;

      if (autogen) variant = "autogen";
      else if (variant === null) variant = argv.options.variant;
      let variants;
      if (secondId === undefined) {
        // base sprite
        variants = getVariantsList(firstId);
      } else if (thirdId === undefined) {
        // bi-fusion
        variants = getVariantsList(firstId, secondId);
      } else {
        // tri-fusion
        variants = getVariantsList(firstId, secondId, thirdId);
      }

      if (variant === undefined && variants.length > 1) {
        await session.send(`从该融合的以下变体中选一个吧: \n${variants.join(",").replace(" ", "基础")}`);
        const result = await session.prompt(
          async (session) => {
            return session.event.message.elements[0].attrs.content;
          },
          { timeout: 10000 }
        );
        if (result === undefined) return "Time Limit Error!";
        variant = result;
      }
      variant = variant === "" || variant === "基础" ? " " : variant;

      // FIXME: 会出现无对应融合的问题？

      if (variants.indexOf(variant) === -1 && !autogen) return "暂时还没有这种融合呢。";

      if (variant === " ") variant = "vanilla";

      const uid = session.event.user.id;
      const uname = session.username;
      const aid = await getAidAsync(ctx, uid);

      const id = await ctx.database.get("fuseFavor", {
        firstId,
        secondId,
        thirdId,
        variant,
        user: aid,
      });

      if (id.length > 0) {
        return `${uname}已经在喜欢了！`;
      }

      await ctx.database.create("fuseFavor", {
        firstId,
        secondId,
        thirdId,
        variant,
        user: aid,
      });

      return `原来${uname}喜欢${displayFuseEntry({ firstId, secondId, thirdId, variant })}！`;
    })
    .alias("喜欢")
    .alias("喜欢这个");

  ctx
    .command("unlikef [first] [second] [third]", "将该融合从喜欢列表中删除")
    .option("variant", "-v [variant] 指定变体，仅在非引用回复时有效", { type: /^[a-z]*$/ })
    .action(async (argv, first, second, third) => {
      if (argv.args.length < 1) return;

      const session = argv.session;

      const firstId = tryParseIntoPifId(first);
      const secondId = tryParseIntoPifId(second);
      const thirdId = tryParseIntoPifId(third);

      if (firstId === null) {
        return "尚不支持宝可梦: " + first;
      } else if (secondId === null) {
        return "尚不支持宝可梦: " + second;
      } else if (thirdId === null) {
        return "尚不支持宝可梦: " + third;
      }

      let variant = argv.options.variant;
      const uid = session.event.user.id;
      const uname = session.event.user.name;

      const aid = await getAidAsync(ctx, uid);

      const variants = await ctx.database.get("fuseFavor", {
        firstId,
        secondId,
        thirdId,
        variant,
        user: aid,
      });

      if (variant === undefined && variants.length === 1) {
        variant = variants[0].variant;
      } else if (variant === undefined) {
        await session.send(`从该融合的以下变体中选一个吧: \n${variants.join(",").replace(" ", "基础")}`);
        const result = await session.prompt(10000);
        if (result === undefined) return "Time Limie Error!";

        const target = variants.filter((v) => v.variant === result);
        if (target.length === 0) return `好像并没有喜欢${result}这个变体呢。`;

        await ctx.database.remove("fuseFavor", [target[0].id]);
        await ctx.database.remove("fuseFavor", [variants[0].id]);
      } else {
        const target = variants.filter((v) => v.variant === variant);
        if (target.length === 0) return `好像并没有喜欢${variant}这个变体呢。`;

        await ctx.database.remove("fuseFavor", [target[0].id]);
      }

      return `${uname}已经不喜欢${displayFuseEntry({ firstId, secondId, thirdId, variant })}了吗？`;
    });

  ctx.command("showff", "显示喜欢列表").action(async (argv) => {
    const match = argv.source.match(AtRegex);
    const session = argv.session;

    let uid = "";
    let uname = "";

    if (match !== null && match.filter((m) => m !== undefined).length === 3) {
      uid = match[1];
      uname = match[2];
    } else {
      uid = argv.session.event.user.id;
      uname = argv.session.username;
    }
    const aid = await getAidAsync(ctx, uid);
    if (aid === null) return `${uname}还没有注册哦，无法显示喜欢的融合。`;

    const list = await ctx.database.get("fuseFavor", {
      user: aid,
    });

    if (list.length === 0) {
      return `${uname}还没有喜欢的融合哦。`;
    }

    const shuffledList = Random.shuffle(list);

    const rand = Random.int(0, 10);

    if (rand >= 2) {
      return await showFavorList(ctx, shuffledList, session);
    } else if (rand < 2) {
      const favorDict: { [key: string]: number } = {};
      shuffledList.forEach((entry) => {
        favorDict[entry.firstId] = (favorDict[entry.firstId] ?? 0) + 1;
        if (entry.secondId !== undefined && entry.secondId !== null) favorDict[entry.secondId] = (favorDict[entry.secondId] ?? 0) + 1;
        if (entry.thirdId !== undefined && entry.thirdId !== null) favorDict[entry.thirdId] = (favorDict[entry.thirdId] ?? 0) + 1;
      });
      let favorate = "";
      let max = 0;
      Object.entries(favorDict).forEach(([k, v]) => {
        if (v > max) {
          favorate = k;
          max = v;
        }
      });
      return `${uname}最喜欢的宝可梦应该是${getPokeNameByPifId(favorate)}吧！`;
    }
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
      uname = argv.session.username;
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

    const entry: FuseEntry = {
      firstId: target.firstId,
      secondId: target.secondId,
      thirdId: target.thirdId,
      variant: target.variant,
    };

    const url = getPifUrl(entry);

    return `${uname}很喜欢${displayFuseEntry(entry)}！\n${h("img", { src: url })}`;
  });

  ctx.command("nick <nickname>", "通过昵称显示融合图像").action(async (_, nickname) => {
    const picks = await ctx.database.get("fuseFavor", { nickname });

    if (picks.length === 0) {
      return "还没有这个昵称呢。";
    }

    const entry: FuseEntry = {
      firstId: picks[0].firstId,
      secondId: picks[0].secondId,
      thirdId: picks[0].thirdId,
      variant: picks[0].variant,
    };

    const url = getPifUrl(entry);
    if (entry.secondId === null) {
      return `正是原汁原味的${displayFuseEntry(entry, nickname)}！\n${h("img", { src: url })}`;
    } else {
      return `正是${displayFuseEntry(entry, nickname)}！\n${h("img", { src: url })}`;
    }
  });
}
