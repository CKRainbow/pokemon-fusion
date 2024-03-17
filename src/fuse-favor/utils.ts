import { Context, Keys, Session, h } from "koishi";
import { FuseFavor } from "./fuse-favor";
import { FuseEntry, displayFuseEntry, getPifUrl } from "../utils";

export async function getAidAsync(ctx: Context, uid: string): Promise<number | null> {
  const aidPick = await ctx.database.get("binding", { pid: uid }, ["aid"]);
  if (aidPick.length <= 0) return null;
  return aidPick[0].aid;
}

export async function showFavorList(ctx: Context, favorList: Pick<FuseFavor, Keys<FuseFavor, any>>[], session: Session) {
  const uname = session.username;
  let totalPages = Math.ceil(favorList.length / 10);
  let page = 0;
  while (true) {
    let response = `${uname}喜欢这些融合： \n${favorList
      .slice(page * 10, (page + 1) * 10)
      .map((v, idx) => `[${idx}] ${displayFuseEntry({ firstId: v.firstId, secondId: v.secondId, thirdId: v.thirdId, variant: v.variant }, v.nickname)}\n`)
      .join("")}${page > 0 ? "[p]上一页" : ""}第[${page + 1}/${totalPages}]页 ${page < totalPages - 1 ? "[n]下一页" : ""}`;
    await session.send(response);
    let result = await session.prompt(4000);
    if (result === "p" && page > 0) {
      page--;
    } else if (result === "n" && page < totalPages - 1) {
      page++;
    } else if (!Number.isNaN(Number.parseInt(result))) {
      let idx = Number.parseInt(result) + 10 * page;
      if (idx >= favorList.length) {
        return "Segmentation Fault!";
      }

      const aid = await getAidAsync(ctx, session.event.user.id);
      if (favorList[idx].user !== aid) {
        return `Wrong Authentication!`;
      }

      let favorEntry: FuseEntry = {
        firstId: favorList[idx].firstId,
        secondId: favorList[idx].secondId,
        thirdId: favorList[idx].thirdId,
        variant: favorList[idx].variant,
      };
      return await favorEntryAction(ctx, favorEntry, favorList[idx], session);
    } else if (result === undefined) {
      return;
    } else {
      return "Segmentation Fault!";
    }
  }
}

async function favorEntryAction(ctx: Context, favorEntry: FuseEntry, databaseEntry: Pick<FuseFavor, Keys<FuseFavor, any>>, session: Session) {
  const uname = session.username;
  const url = getPifUrl(favorEntry);
  const response = `对于${displayFuseEntry(favorEntry)}，${uname}有什么想法吗？
${h("img", { src: url })}
[1] 起个昵称
[2] 从喜欢列表中移除
[3] 没什么`;

  await session.send(response);

  let result = await session.prompt(8000);
  if (result === "1") {
    await session.send("请输入昵称");
    const nickname = await session.prompt(8000);
    if (nickname === undefined) return;
    var sameNickname = await ctx.database.get("fuseFavor", {
      nickname: nickname,
    });
    if (sameNickname.length > 0) {
      return "该昵称已经被使用了！";
    }
    await ctx.database.set("fuseFavor", databaseEntry.id, { nickname: nickname });
    return `之后可以用"${nickname}"称呼了！`;
  } else if (result === "2") {
    await ctx.database.remove("fuseFavor", [databaseEntry.id]);
    return `${uname}已经不喜欢${displayFuseEntry(favorEntry)}了吗？`;
  } else if (result === "3") {
    return;
  } else if (result === undefined) {
    return "Time Limit Error!";
  } else {
    return "Segmentation Fault!";
  }
}
