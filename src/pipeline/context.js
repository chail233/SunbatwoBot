// @ts-check

import config from "../config/index.js";
import members from "../data/members.js";

/**
 * 从原始 OneBot 事件构建管道上下文
 * @param {object} event OneBot 事件
 * @param {import("../bot/adapter.js").OneBotAdapter} adapter
 * @returns {object} 上下文对象
 */
export function buildContext(event, adapter) {
    const text = extractText(event.message || []);
    const userId = event.user_id?.toString();
    const isAdmin = userId === config.owner;
    const isTargetGroup =
        event.message_type === "group" &&
        event.group_id?.toString() === config.targetGroupId;

    return {
        event,
        adapter,
        text,
        userId,
        senderName: resolveName(event),
        isAdmin,
        isTargetGroup,
        /** 是否 @ 了机器人 */
        isAtBot: false,
        /** 图片识别描述 */
        imageDescription: null,
        /** 是否已被某个 handler 处理 */
        handled: false,
    };
}

/**
 * 提取消息中的纯文本
 * @param {Array} segments 消息段数组
 * @returns {string}
 */
function extractText(segments) {
    return segments
        .filter((x) => x.type === "text")
        .map((x) => x.data.text)
        .join("");
}

/**
 * 解析发送者昵称
 * @param {object} event
 * @returns {string}
 */
function resolveName(event) {
    const userId = event.user_id?.toString();
    if (userId && members.has(userId)) {
        return members.get(userId);
    }
    return event.sender?.nickname ?? "未知";
}