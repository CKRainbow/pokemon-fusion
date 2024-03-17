import { Context, Random, h } from "koishi";
import {
  getPifUrl,
  getValidVariant,
  getVariantName,
  randFuse,
  randFuseAll,
  randFuseByBody,
  randFuseByHead,
  tryGetPokeIdFromName,
  tryParseIntoPifId,
  validCustomFusion,
  displayFuseEntry,
  getVariantsList,
} from "../utils";
import { BaseValidList, MatrixIdToPifId } from "../valid_matrix";

export interface FuseCoreConfig {}

export const name = "fuse-core";

export function apply(ctx: Context, config: FuseCoreConfig) {
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

      if (headId === undefined && bodyId === undefined) {
        [headId, bodyId] = randFuse();
      } else if (bodyId === undefined) {
        [headId, bodyId] = randFuseByHead(headId);
      } else if (headId === undefined) {
        [headId, bodyId] = randFuseByBody(bodyId);
      }

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
  /*
  ctx
    .command("trifuse [one] [two] [three]", "融合三只宝可梦")
    .option("nickname", "-n <nickname> 指定该昵称的宝可梦")
    .option("variant", "-v [variant] 指定变体")
    .action((argv, one, two, three) => {
      const option = argv.options;
      if (one !== undefined && two !== undefined && three !== undefined) {
        let firstId = tryParseIntoPifId(one);
        let secondId = tryParseIntoPifId(two);
        let thirdId = tryParseIntoPifId(three);
        [firstId, secondId, thirdId] = [firstId, secondId, thirdId].sort((a, b) => Number(a) - Number(b));

        const key = `${firstId}.${secondId}.${thirdId}`;

        if (TriValidList[key]) {
          let variant = argv.options.variant;
          let infoMessage = "";
          if (variant === "") variant = " ";

          let url = "";
          if (TriValidList[key].includes(variant)) {
            url = getPifUrlTri(firstId, secondId, thirdId, variant);
          } else {
            const validVariants = TriValidList[key].split(",");
            const validVariant = Random.pick(validVariants);
            infoMessage += `该融合并没有变体${getVariantName(variant)}。\n`;
            url = getPifUrlTri(firstId, secondId, thirdId, validVariant);
          }

          return `要融合的宝可梦原来是${displayFuseEntry(firstId, secondId, thirdId, variant)}！\n${infoMessage}${h(
            "img",
            { src: url }
          )}`;
        } else {
        }
      } else if (option.nickname !== undefined) {
        const nickname = option.nickname;
      } else {
        const validKey = Random.pick(Object.keys(TriValidList));
        const [firstId, secondId, thirdId] = validKey.split(".");
        const validVariants = TriValidList[validKey].split(",");
        const validVariant = Random.pick(validVariants);
        const infoMessage = "";
        const url = getPifUrlTri(firstId, secondId, thirdId, validVariant);

        return `要融合的宝可梦原来是${displayFuseEntry(firstId, secondId, thirdId, variant)}！\n${infoMessage}${h(
          "img",
          { src: url }
        )}`;
      }
    })
    .alias("三重融合");
*/
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
}
