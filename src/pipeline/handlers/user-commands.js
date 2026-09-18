// @ts-check

import { getWeatherText } from "../../services/weather.js";
import recorder from "../../llm/recorder.js";
import {setting, setting as proactive_chat_setting} from "./proactive-chat.js";

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

USER_CMD_MAP.set("help", async (args, ctx) => {
    const helpText = [
        "可用指令：",
        "  #gw <城市>  — 查询天气",
        "  #help       — 显示本帮助",
        "",
        "管理员指令：",
        "  #clear      — 清除短期记忆",
        "  #pchat      — 开启/关闭主动回复",
        "  #msgs       — 列出短期记录",
        "  #summary    — 显示中期记忆概括",
    ].join("\n");
    return helpText;
});

// ----- 调试命令（仅管理员） -----

USER_CMD_MAP.set("msgs", async (args, ctx) => {
    if (!ctx.isAdmin) return "无权限";
    const all = recorder.getAll();
    if (all.length === 0) return "短期记录为空";
    const lines = all.map((m, i) => `[${i + 1}] ${m.role}: ${m.content.slice(0, 80)}`);
    return `短期记录共 ${all.length} 条：\n${lines.join("\n")}`;
});

USER_CMD_MAP.set("summary", async (args, ctx) => {
    if (!ctx.isAdmin) return "无权限";
    const summary = recorder.getMidSummary();
    if (!summary) return "中期记忆为空";
    return `中期记忆（${summary.length} 字）：\n${summary}`;
});

USER_CMD_MAP.set("pchat", async (args, ctx) => {
    if(args.length===0) return "缺少参数 true/false";
    if(args[0]==="true"){
        setting.enable = true;
        return "开启了主动回复"
    }
    else {
        setting.enable = false;
        return "关闭了主动回复"
    }
})
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