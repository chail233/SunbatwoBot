import { getWeatherText } from "../../services/weather.js";
import { getModelsText } from "../../services/getModels.js";
import recorder from "../../llm/recorder.js";
import config from "../../config.js";
import {skills} from "../../llm/skill.js";
import {reloadSkills} from "../../llm/skill.js";
import {mcpClient} from "../../llm/mcp-client.js";
import {getAllTools} from "../../llm/tools.js";

const cmds = [
    {
        name: "gw",
        description: "查询天气",
        params: [{ name: "城市", desc: "城市名称" }],
        handler: async (args, ctx) => {
            if (!args[0]) return "请指定城市名，例如 #gw 杭州";
            return await getWeatherText(args[0]);
        }
    },
    {
        name: "clear",
        description: "清除短期记忆（管理员）",
        params: [],
        handler: async (args, ctx) => {
            if (!ctx.isAdmin) return "无权限";
            const cnt = recorder.length;
            recorder.clear();
            return `清除了${cnt}条消息。`;
        }
    },
    {
        name: "help",
        description: "显示指令列表",
        params: [],
        handler: async (args, ctx) => {
            return cmds.map(cmd => `#${cmd.name} ${cmd.params.map(p => `<${p.name}:${p.desc}>`).join(" ")} //${cmd.description}`).join('\n');
        }
    },
    {
        name: "msgs",
        description: "列出短期记录",
        params: [],
        handler: async (args, ctx) => {
            const all = recorder.getAll();
            if (all.length === 0) return "短期记录为空";
            const lines = all.map((m, i) => {
                return `[${i + 1}] ${m.role}: ${m.content}`;
            });
            return `短期记录共 ${all.length} 条：\n${lines.join("\n")}`;
        }
    },
    {
        name: "cmsgs",
        description: "列出缓存记录",
        params: [],
        handler: async (args, ctx)=>{
            const all = recorder.getCache();
            if (all.length === 0) return "缓存记录为空";
            const lines = all.map((m, i) => {
                return `[${i + 1}] ${m.role}: ${m.content}`;
            });
            return `缓存记录共 ${all.length} 条：\n${lines.join("\n")}`;
        }
    },
    {
        name: "sm",
        description: "显示中期记忆概括",
        params: [],
        handler: async (args, ctx) => {
            const summary = recorder.getMidSummary();
            if (!summary) return "中期记忆为空";
            return `中期记忆（${summary.length} 字）：\n${summary}`;
        }
    },
    {
        name: "pchat",
        description: "开启/关闭主动回复",
        params: [{ name: "开关", desc: "true/false" }],
        handler: async (args, ctx) => {
            if (args.length === 0) return "缺少参数 true/false";
            if (args[0] === "true") {
                config.EnableProactiveChat = true;
                return "开启了主动回复";
            }
            else {
                config.EnableProactiveChat = false;
                return "关闭了主动回复";
            }
        }
    },
    {
        name: "model",
        description: "查询模型",
        params: [],
        handler: async (args, ctx) => {
            return await getModelsText();
        }
    },
    {
        name: "ms",
        description: "设置文本模型（管理员）",
        params: [{ name: "模型名称", desc: "模型ID" }],
        handler: async (args, ctx) => {
            if (!ctx.isAdmin) return "无权限";
            if (args.length === 0) return "缺少参数";
            config.CHAT_MODEL = args[0];
            return `切换了模型为 ${args[0]}`;
        }
    },
    {
        name: "skills",
        description: "列出技能列表",
        params: [],
        handler: async (args, ctx) => {
            return "技能列表：\n" + skills.map(skill => skill.name).join("\n");
        }
    },
    {
        name: "reloadskls",
        description: "重新加载技能(管理员)",
        params: [],
        handler: async (args, ctx) => {
            if (!ctx.isAdmin) return "无权限";
            await reloadSkills();
            return "已更新，技能列表：\n" + skills.map(skill => skill.name).join("\n");
        }
    },
    {
        name: "compress",
        description: "压缩短期记忆（管理员）",
        params: [],
        handler: async (args, ctx) => {
            if (!ctx.isAdmin) return "无权限";
            const cnt = recorder.compress();
            return `压缩完成`;
        }
    },
    {
        name: "agent",
        description: "agent模式开关(管理员)",
        params: [{ name: "开关", desc: "true/false" }],
        handler: async (args, ctx) => {
            if (!ctx.isAdmin) return "无权限";
            if (args.length === 0) return "缺少参数 true/false";
            if (args[0] === "true") {
                config.agentMode = true;
                return "开启了agent模式";
            }
            else {
                config.agentMode = false;
                return "关闭了agent模式";
            }
        }
    },
    {
        name:"mcp",
        description: "列出MCP配置",
        params: [],
        handler: async (args, ctx) => {
            const result = [...mcpClient.connections.keys()];
            return `MCP列表：\n${result.join("\n")}`;
        }
    },
    {
        name:"tools",
        description: "工具列表",
        params: [],
        handler:async (args, ctx) => {
            return "工具列表：\n" + (await getAllTools()).map(tool => tool.function.name).join("\n");
        }
    }
];

const USER_CMD_MAP = new Map(cmds.map(cmd => [cmd.name, cmd.handler]));


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