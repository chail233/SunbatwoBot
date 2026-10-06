import chatRecorder from "./recorder.js";
import {makeMemoryUserId, searchMemory, getUserProfile} from "./long-term-memory.js";
import config from "../config.js";
import logger from "../utils/logger.js";
import { readFile as fsReadFile } from "node:fs/promises";
import { resolve, dirname, sep } from "node:path";
import { fileURLToPath } from "node:url";

/**
 *模型可以调用的工具
 */
const tools = [
    {
        type: "function",
        function: {
            name: "test_function",
            description: "测试工具，用于测试能否正常调用工具",
            parameters: {},
        },
    },
    {
        type: "function",
        function: {
            name: "get_memory",
            description: "根据当前对话内容搜索相关记忆",
            parameters: {},
        },
    },
    {
        type: "function",
        function: {
            name: "get_user_profile",
            description: "根据用户 QQ 号获取该用户的画像信息，可用于了解特定用户的偏好、性格等",
            parameters: {
                type: "object",
                properties: {
                    qq: {
                        type: "string",
                        description: "用户的 QQ 号",
                    },
                },
                required: ["qq"],
            },
        },
    },
    {
        type: "function",
        function: {
            name: "read_file",
            description: "读取指定路径的文件内容",
            parameters: {
                type: "object",
                properties: {
                    filepath: {
                        type: "string",
                        description: "相对于 src/ 目录的文件路径",
                    },
                },
                required: ["filepath"],
            },
        },
    }
]

export default tools;


async function testTool(param){
    return "114514";
}


async function getMemory(param) {
    const shortTermMessages = chatRecorder.getAll();
    if (shortTermMessages.length > 0) {
        const userId = makeMemoryUserId(config.targetGroupId);

        const userMessages = shortTermMessages
            .filter((m) => m.role === "user" || m.role === "assistant")
            .slice(-10);

        if (userMessages.length === 0) return "没有有效对话记录";

        const recalled = await searchMemory(userId, userMessages);
        logger.debug("长期记忆搜索结果:", recalled);
        return recalled.join("\n---\n") || "没有找到相关记忆";
    }
    return "没有对话记录，无法搜索记忆";
}

/**
 * 获取指定用户的画像信息
 * @param {{qq: string}} param
 */
async function getUserProfileTool(param) {
    const qq = param?.qq;
    if (!qq) return "缺少 QQ 号参数";

    const profile = await getUserProfile(qq);
    if (!profile) return `未找到 QQ 号 ${qq} 的用户画像`;
    return profile;
}


async function readFile(param) {
    const filepath = param?.filepath;
    if (!filepath) return "缺少文件路径参数";

    // 基准路径：src/（tools.js 在 src/llm/，回退一级到 src/）
    const srcDir = dirname(fileURLToPath(import.meta.url));
    const baseDir = resolve(srcDir, "..");
    const fullPath = resolve(baseDir, filepath);

    // 路径穿越防护
    if (fullPath !== baseDir && !fullPath.startsWith(baseDir + sep)) {
        return "非法路径，禁止访问上级目录";
    }

    // 白名单校验
    const whitelist = config.readFileDirs || [];
    const allowed = whitelist.some(dir => {
        const allowedDir = resolve(baseDir, dir);
        return fullPath === allowedDir || fullPath.startsWith(allowedDir + sep);
    });

    if (!allowed) {
        return `无权访问该路径，仅允许读取以下目录：${whitelist.join(", ")}`;
    }

    try {
        const content = await fsReadFile(fullPath, "utf-8");
        const MAX_LEN = 4000;
        if (content.length > MAX_LEN) {
            return content.slice(0, MAX_LEN) + "\n\n...[内容过长已截断]";
        }
        return content;
    }
    catch (err) {
        if (err.code === "ENOENT") return `文件 "${filepath}" 不存在`;
        return `读取文件失败: ${err.message}`;
    }
}




const toolMap = new Map(
    [
        ["test_function", testTool],
        ["get_memory", getMemory],
        ["get_user_profile", getUserProfileTool],
        ["read_file", readFile],
    ]
);


/**
 * 调用工具
 * @param {string} name
 * @param {object} parameter
 */
export async function callTool(name, parameter){
    const tool = toolMap.get(name);
    if (!tool) {
        throw new Error(`未知工具: ${name}`);
    }
    return `${name}调用结果：${await tool(parameter)}`;
}


