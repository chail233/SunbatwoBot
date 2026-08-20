// @ts-check

import getSentence from "../../services/hitokoto.js";
import getAcg from "../../services/acg.js";
import getSunGirl from "../../data/sunbatwo-girls.js";
import recorder from "../../llm/recorder.js";

/**
 * 关键词命令处理器
 * 精确匹配文本触发对应功能
 */

const CMD_MAP = new Map();

CMD_MAP.set("来句台词", async (ctx) => {
    const sentence = await getSentence();
    if (sentence) {
        ctx.adapter.sendGroupMsg(ctx.event.group_id, sentence);
        recorder.add({ role: "assistant", content: sentence });
    } else {
        ctx.adapter.sendGroupMsg(ctx.event.group_id, "别急");
        recorder.add({ role: "assistant", content: "别急" });
    }
});

CMD_MAP.set("来张图", async (ctx) => {
    const img = await getAcg();
    if (img) {
        ctx.adapter.sendGroupMsg(ctx.event.group_id, img);
    }
});

CMD_MAP.set("来只孙巴二娘", async (ctx) => {
    ctx.adapter.sendGroupMsg(ctx.event.group_id, [
        { type: "image", data: { file: getSunGirl() } },
    ]);
});

CMD_MAP.set("来只牛魔", async (ctx) => {
    ctx.adapter.sendGroupMsg(ctx.event.group_id, [
        {
            type: "image",
            data: {
                file: "https://img.tofaka.com/autoupload/f/8d522/20260817/myLT/2048X2048/0.png",
            },
        },
    ]);
});

/**
 * @param {object} ctx 管道上下文
 * @returns {Promise<boolean>} 是否已处理
 */
export default async function keywordCommands(ctx) {
    const handler = CMD_MAP.get(ctx.text);
    if (!handler) return false;

    await handler(ctx);
    return true;
}