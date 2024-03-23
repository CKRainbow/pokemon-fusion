import { Context, Keys, Session, h } from "koishi";
import { FuseFavor } from "./fuse-favor";
import { FuseEntry, displayFuseEntry, getPifUrl, isPermittedChangeNickname, addNickname, removeNickname } from "../utils";

export async function getAidAsync(ctx: Context, uid: string): Promise<number | null> {
  const aidPick = await ctx.database.get("binding", { pid: uid }, ["aid"]);
  if (aidPick.length <= 0) return null;
  return aidPick[0].aid;
}

export async function addFavor(ctx: Context, favorEntry: FuseEntry, aid: number, uname: string) {
  const id = await ctx.database.get("fuseFavor", {
    ...favorEntry,
    user: aid,
  });

  if (id.length > 0) {
    return `${uname}已经在喜欢了！`;
  }

  const nicknamePick = await ctx.database.get("fuseNick", favorEntry);
  var nickname = null;
  if (nicknamePick !== null) {
    nickname = nicknamePick[0].nickname;
  }

  await ctx.database.create("fuseFavor", {
    ...favorEntry,
    user: aid,
    nick: nickname,
  });

  return `原来${uname}喜欢${displayFuseEntry(favorEntry, nickname)}！`;
}

export async function showFavorList(ctx: Context, favorList: Pick<FuseFavor, Keys<FuseFavor, any>>[], session: Session, aid: number) {
  const uname = session.username;
  let totalPages = Math.ceil(favorList.length / 10);
  let page = 0;
  let showList = favorList.map((v) => `${displayFuseEntry({ firstId: v.firstId, secondId: v.secondId, thirdId: v.thirdId, variant: v.variant }, v.nick)}`);
  while (true) {
    let response = `${uname}喜欢这些融合： \n${showList
      .slice(page * 10, (page + 1) * 10)
      .map((v, idx) => `[${idx}] ${v}\n`)
      .join("")}${page > 0 ? "[p]上一页" : ""}第[${page + 1}/${totalPages}]页 ${page < totalPages - 1 ? "[n]下一页" : ""}\n[-1] 算了`;
    await session.send(response);
    let result = await session.prompt(100000);
    if (result === "-1" || result === "算了") {
      return;
    } else if (result === "p" && page > 0) {
      page--;
    } else if (result === "n" && page < totalPages - 1) {
      page++;
    } else if (!Number.isNaN(Number.parseInt(result))) {
      let idx = Number.parseInt(result) + 10 * page;
      if (idx >= favorList.length) {
        return "Segmentation Fault!";
      }

      if (favorList[idx].user !== aid) {
        return `Wrong Authentication!`;
      }

      let favorEntry: FuseEntry = {
        firstId: favorList[idx].firstId,
        secondId: favorList[idx].secondId,
        thirdId: favorList[idx].thirdId,
        variant: favorList[idx].variant,
      };
      return await favorEntryAction(ctx, favorEntry, favorList[idx], session, aid);
    } else if (result === undefined) {
      return;
    } else {
      return "Segmentation Fault!";
    }
  }
}

async function favorEntryAction(ctx: Context, favorEntry: FuseEntry, databaseEntry: Pick<FuseFavor, Keys<FuseFavor, any>>, session: Session, aid: number) {
  const uname = session.username;
  const url = getPifUrl(favorEntry);
  const response = `对于${displayFuseEntry(favorEntry, databaseEntry.nick)}，${uname}有什么想法吗？
${h("img", { src: url })}
[1] 修改昵称
[2] 从喜欢列表中移除
[3] 没什么`;

  await session.send(response);

  let result = await session.prompt(8000);
  if (result === "1") {
    const [isPermitted, takeAid] = await isPermittedChangeNickname(ctx, favorEntry, aid);
    if (!isPermitted) {
      const takeUser = await ctx.database.get("binding", { aid: takeAid }, ["pid"]);
      return `这个融合的昵称已经被 ${h("at", { id: takeUser[0].pid })} 先占用了。`;
    }

    await session.send("请输入昵称，输入-1则删除昵称");
    const nickname = await session.prompt(8000);
    if (nickname === undefined) return "Time Limit Error!";

    if (nickname === "-1") {
      return await removeNickname(ctx, favorEntry, databaseEntry.id);
    }

    return await addNickname(ctx, nickname, favorEntry, aid, databaseEntry.id);
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
