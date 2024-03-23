import { Context, Random, h } from "koishi";
import {
  getPifUrl,
  getValidVariant,
  getVariantName,
  randFuse,
  randFuseAll,
  tryGetPokeIdFromName,
  tryParseIntoPifId,
  validCustomFusion,
  displayFuseEntry,
  getVariantsList,
  tryParseFuseMessage,
  FuseEntry,
  isPermittedChangeNickname,
  removeNickname,
  addNickname,
} from "../utils";
import { BaseValidList, MatrixIdToPifId, TriValidList } from "../valid_matrix";
import { PifId } from "../consts";
import { getAidAsync } from "../fuse-favor/utils";

declare module "koishi" {
  interface Tables {
    fuseNick: FuseNick;
  }
}

export interface FuseNick {
  firstId: PifId;
  secondId: PifId;
  thirdId: PifId;
  variant: string;
  user: number;
  nickname: string;
}

export interface FuseCoreConfig {}

export const name = "fuse-core";
export const inject = ["database"];

export function apply(ctx: Context, config: FuseCoreConfig) {
  ctx.model.extend(
    "fuseNick",
    {
      firstId: {
        type: "string",
      },
      secondId: {
        type: "string",
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
      primary: ["firstId", "secondId", "thirdId", "variant"],
      unique: ["nickname"],
      foreign: {
        user: ["user", "id"],
      },
    }
  );

  ctx
    .command("fuse [head] [body]", "获得某两个宝可梦的融合")
    .option("all", "-a 无视人工图要求")
    .option("variant", "-v [variant] 指定变体", { type: /^[a-z]*$/ })
    .option("list", "-l 列出该融合的所有变体")
    .action((argv, head, body) => {
      const options = argv.options;

      let headId = tryParseIntoPifId(head);
      let bodyId = tryParseIntoPifId(body);

      if (headId === null) {
        return "尚不支持该头部宝可梦";
      } else if (bodyId === null) {
        return "尚不支持该身体宝可梦";
      }

      if (options.all) {
        if (headId === undefined) headId = randFuseAll();
        if (bodyId === undefined) bodyId = randFuseAll();
      }

      [headId, bodyId] = randFuse(headId, bodyId);

      if (options.list) {
        return `${displayFuseEntry({ firstId: headId, secondId: bodyId })}拥有这些变体:\n${getVariantsList(headId, bodyId).replace(" ", "基础")}`;
      }

      let variant = argv.options.variant;
      let infoMessage = "";
      if (variant === "") variant = " ";

      if (validCustomFusion(headId, bodyId)) {
        const validVariant = getValidVariant({ firstId: headId, secondId: bodyId, variant });
        if (variant !== validVariant && variant !== undefined) {
          infoMessage += `该融合并没有变体${getVariantName(variant)}。\n`;
        }
        variant = validVariant;
      } else if (options.all) {
        variant = "autogen";
      } else {
        return "暂时还没有这种融合呢。";
      }
      const url = getPifUrl({ firstId: headId, secondId: bodyId, variant });

      return `要融合的宝可梦原来是${displayFuseEntry({ firstId: headId, secondId: bodyId, variant })}！\n${infoMessage}${h("img", { src: url })}`;
    })
    .alias("随机融合", { args: ["0", "0"] })
    .shortcut(/^锁头 (\S*)\s*$/, { args: ["$1", "0"] })
    .shortcut(/^锁身 (\S*)\s*$/, { args: ["0", "$1"] })
    .alias("融合")
    .usage("第一个参数代表头部，第二个参数代表身体，可以使用图鉴编号、中文名或英文名。");

  ctx
    .command("trifuse [one] [two] [three]", "融合三只宝可梦")
    .option("variant", "-v [variant] 指定变体")
    .option("list", "-l 列出该融合的所有变体")
    .action((argv, one, two, three) => {
      const options = argv.options;
      if (one !== undefined && two !== undefined && three !== undefined) {
        let firstId = tryParseIntoPifId(one);
        let secondId = tryParseIntoPifId(two);
        let thirdId = tryParseIntoPifId(three);
        [firstId, secondId, thirdId] = [firstId, secondId, thirdId].sort((a, b) => Number(a) - Number(b));

        const key = `${firstId}.${secondId}.${thirdId}`;
        const variants = TriValidList[key];

        if (variants) {
          let variant = options.variant;
          let infoMessage = "";
          if (variant === "") variant = " ";

          if (options.list) {
            return `${displayFuseEntry({ firstId, secondId, thirdId })}拥有这些变体:\n${variants.replace(" ", "基础")}`;
          }

          let url = "";
          if (variants.includes(variant)) {
            url = getPifUrl({ firstId, secondId, thirdId, variant });
          } else {
            if (variant != undefined) {
              infoMessage += `该融合并没有变体${getVariantName(variant)}。\n`;
            }
            const validVariants = variants.split(",");
            variant = Random.pick(validVariants);
            url = getPifUrl({ firstId, secondId, thirdId, variant });
          }

          return `要融合的宝可梦原来是${displayFuseEntry({ firstId, secondId, thirdId, variant })}！\n${infoMessage}${h("img", { src: url })}`;
        } else {
          return "暂时还没有这种融合呢。";
        }
      } else {
        const validKey = Random.pick(Object.keys(TriValidList));
        const [firstId, secondId, thirdId] = validKey.split(".");
        const validVariants = TriValidList[validKey].split(",");
        const variant = Random.pick(validVariants);
        const infoMessage = "";
        const url = getPifUrl({ firstId, secondId, thirdId, variant });

        return `要融合的宝可梦原来是${displayFuseEntry({ firstId, secondId, thirdId, variant })}！\n${infoMessage}${h("img", { src: url })}`;
      }
    })
    .alias("三重融合");

  ctx
    .command("base [base]", "显示某只宝可梦的基本图像")
    .option("variant", "-v [variant] 指定变体")
    .option("list", "-l 列出该融合的所有变体")
    .action((argv, base) => {
      const option = argv.options;
      if (base !== undefined) {
        let baseId = tryParseIntoPifId(base);

        if (baseId === null) return "尚不支持该宝可梦";

        const variants = getVariantsList(baseId);

        if (option.list) {
          return `${displayFuseEntry({ firstId: baseId })}拥有这些变体:\n${variants.replace(" ", "基础")}`;
        }

        if (variants.length > 0) {
          let variant = argv.options.variant;
          let infoMessage = "";
          if (variant === "") variant = " ";

          if (!variants.includes(variant)) {
            const validVariants = variants.split(",");
            const originalVariant = variant;
            variant = Random.pick(validVariants);
            if (originalVariant !== undefined) {
              infoMessage += `这个宝可梦并没有变体${getVariantName(originalVariant)}。\n`;
            }
          }
          const url = getPifUrl({ firstId: baseId, variant });

          return `是原汁原味的${displayFuseEntry({ firstId: baseId, variant })}！\n${infoMessage}${h("img", { src: url })}`;
        } else {
          return "怎么回事呢，还没有这个宝可梦的图像呢。";
        }
      } else {
        const validMatrixId = Random.int(BaseValidList.length);
        const validId = MatrixIdToPifId[validMatrixId];
        const validVariants = BaseValidList[validMatrixId].split(",");
        let infoMessage = "";
        let variant = argv.options.variant;
        if (!validVariants.includes(variant)) {
          if (variant !== undefined) infoMessage += `这个宝可梦并没有变体${getVariantName(variant)}。\n`;
          variant = Random.pick(validVariants);
        }
        const url = getPifUrl({ firstId: validId, variant });

        return `是原汁原味的${displayFuseEntry({ firstId: validId, variant })}！\n${infoMessage}${h("img", { src: url })}`;
      }
    });

  ctx
    .command("pid <name>", "查询宝可梦的全国图鉴Id")
    .action((_, name) => {
      const pokeId = tryGetPokeIdFromName(name);

      if (pokeId === null) return `好像没有找到${name}这只宝可梦。`;

      return `${name}的全国图鉴Id是${pokeId}哦。`;
    })
    .alias("图鉴");

  ctx
    .command("addNick [first] [second] [third]", "为该融合添加昵称")
    .option("quote", "-q 通过引用抓取融合")
    .option("nickname", "-n [nickname] 设置昵称")
    .option("variant", "-v [variant] 指定变体，仅在非引用回复时有效", { type: /^[a-z]*$/ })
    .action(async (argv, first, second, third) => {
      const session = argv.session;
      let autogen = false;
      let [firstId, secondId, thirdId, variant] = [undefined, undefined, undefined, undefined];

      if (argv.source.includes("autogen")) autogen = true;

      if (argv.options.quote) {
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
        await session.send(`从该融合的以下变体中选一个吧: \n${variants.replace(" ", "基础")}`);
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

      const fuseEntry: FuseEntry = {
        firstId,
        secondId,
        thirdId,
        variant,
      };

      const uid = session.event.user.id;
      const uname = session.username;
      const aid = await getAidAsync(ctx, uid);

      const [isPermitted, takeAid] = await isPermittedChangeNickname(ctx, fuseEntry, aid);
      const takeUser = await ctx.database.get("binding", { aid: takeAid }, ["pid"]);

      if (!isPermitted) {
        return `这个融合的昵称已经被 ${h("at", { id: takeUser[0].pid })} 先占用了。`;
      }

      var nickname = argv.options.nickname;

      if (nickname === undefined) {
        await session.send("请输入昵称，输入-1则删除昵称");
        nickname = await session.prompt(8000);
        if (nickname === undefined) return "Time Limit Error!";
      }

      if (nickname === "-1") {
        return await removeNickname(ctx, fuseEntry, aid);
      }

      return await addNickname(ctx, nickname, fuseEntry, aid);
    })
    .alias("起昵称", { options: { quote: true } })
    .alias("移除昵称", { options: { quote: true, nickname: "-1" } });
}
