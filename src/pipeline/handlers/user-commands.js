// @ts-check

import { getWeatherText } from "../../services/weather.js";
import recorder from "../../llm/recorder.js";
/**
 * 用户命令处理器
 * 前缀 # 触发，如 #gw 杭州
 */

const USER_CMD_MAP = new Map();

USER_CMD_MAP.set("gw", async (args, ctx) => {
    if (!args[0]) return "请指定城市名，例如 #gw 杭州";
    return await getWeatherText(args[0]);
});

USER_CMD_MAP.set("clear", async (args, ctx) => {
    if(!ctx.isAdmin) return "无权限";
    const cnt = recorder.length;
    recorder.clear();
    return `清除了${cnt}条消息。`;
});

/**
 * 解析用户命令
 * @param {string} rawText
 * @returns {{cmd: string|null, args: string[]}}
 */
function parseCommand(rawText) {
    const text = rawText.trim();
    if (!text.startsWith("#")) {
        return { cmd: null, args: [] };
    }
    const parts = text.slice(1).split(/\s+/);
    return { cmd: parts[0], args: parts.slice(1) };
}

/**
 * @param {object} ctx
 * @returns {Promise<boolean>}
 */
export default async function userCommands(ctx) {
    if (!ctx.text.startsWith("#")) return false;

    const { cmd, args } = parseCommand(ctx.text);
    if (!cmd) {
        ctx.adapter.sendGroupMsg(ctx.event.group_id, "指令格式无效");
        return true;
    }

    const handler = USER_CMD_MAP.get(cmd);
    if (!handler) return false;

    const result = await handler(args, ctx);
    ctx.adapter.sendGroupMsg(ctx.event.group_id, result);
    return true;
}