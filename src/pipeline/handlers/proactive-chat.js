// @ts-check

import chatAPI from "../../llm/chat.js";
import recorder from "../../llm/recorder.js";
import sleep from "../../utils/sleep.js";
import logger from "../../utils/logger.js";
import { PROACTIVE_CHAT_LIMIT } from "../../consts.js";

/**
 * 主动聊天处理器
 * 当群内连续若干条消息无 AI 参与时，主动触发一次对话
 */

/** 无 AI 参与的消息计数 */
let msgWithoutChat = 0;

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
export default async function proactiveChat(ctx) {
    const text = ctx.text + (ctx.imageDescription ? `\n${ctx.imageDescription}` : "");
    const pre = `${ctx.senderName}:\n`;

    // 检查是否达到主动触发阈值
    if (msgWithoutChat >= PROACTIVE_CHAT_LIMIT) {
        logger.info("达到主动聊天阈值，触发 AI 对话");
        msgWithoutChat = 0;
        const res = await chatAPI({
            role: "user",
            content: pre + text,
        });
        if (typeof res !== "string") {
            await sendAiReply(ctx.adapter, ctx.event.group_id, res);
        }
        return true;
    }

    // 未达到阈值，仅记录上下文
    recorder.add({ role: "user", content: pre + text });
    msgWithoutChat++;
    return false;
}