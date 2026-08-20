// @ts-check

import chatAPI from "../../llm/chat.js";
import sleep from "../../utils/sleep.js";
import logger from "../../utils/logger.js";

/**
 * AI 对话处理器
 * 当消息 @ 机器人时触发
 */

/**
 * 发送 AI 回复（支持多条消息分段发送）
 * @param {import("../../bot/adapter.js").OneBotAdapter} adapter
 * @param {string|number} groupId
 * @param {{acts: Array<{cmd: string, content: string}>, tokens: number}} res
 */
async function sendAiReply(adapter, groupId, res) {
    let first = true;
    for (const act of res.acts) {
        if (act.cmd === "text") {
            let content = act.content;
            if (first) {
                first = false;
                content += `(${res.tokens}tokens)`;
            }
            adapter.sendGroupMsg(groupId, content);
        }
        await sleep(1200 + Math.floor(Math.random() * 1000));
    }
}

/**
 * @param {object} ctx
 * @returns {Promise<boolean>}
 */
export default async function aiChat(ctx) {
    if (!ctx.isAtBot) return false;

    const content = ctx.text + (ctx.imageDescription ? `\n${ctx.imageDescription}` : "");
    const msg = {
        role: "user",
        content: `${ctx.senderName}对你说:\n${content}`,
    };

    logger.info("AI 对话请求:", content);

    const res = await chatAPI(msg);
    if (typeof res === "string") {
        // 错误响应
        ctx.adapter.sendGroupMsg(ctx.event.group_id, res);
    } else {
        await sendAiReply(ctx.adapter, ctx.event.group_id, res);
    }

    return true;
}