import chatRecorder from "./recorder.js";
import {makeMemoryUserId, searchMemory, getUserProfile} from "./long-term-memory.js";
import config from "../config.js";
import logger from "../utils/logger.js";
import { readFile as fsReadFile } from "node:fs/promises";
import { resolve, dirname, sep, extname } from "node:path";
import { fileURLToPath } from "node:url";
import { execFile } from "node:child_process";

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
    },
    {
        type: "function",
        function: {
            name: "run_JS",
            description: "运行 JavaScript 脚本，可通过 args 传递参数给脚本",
            parameters: {
                type: "object",
                properties: {
                    filepath: {
                        type: "string",
                        description: "相对于 src/ 的JavaScript 脚本文件路径",
                    },
                    args: {
                        type: "object",
                        description: "传递给脚本的参数，脚本通过 process.argv[2] 接收（JSON 字符串）",
                    },
                },
                required: ["filepath"],
            }
        }
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
         return await fsReadFile(fullPath, "utf-8");
    }
    catch (err) {
        if (err.code === "ENOENT") return `文件 "${filepath}" 不存在`;
        return `读取文件失败: ${err.message}`;
    }
}




/**
 * 运行指定路径的 JS 脚本并返回执行结果
 * 安全策略：路径穿越防护 + 白名单校验 + 仅限 .js 文件
 * @param {{filepath: string, args?: object}} param
 */
async function runJS(param) {
    const filepath = param?.filepath;
    if (!filepath) return "缺少文件路径参数";

    // 仅允许 .js 文件
    if (extname(filepath) !== ".js") {
        return "只能执行 .js 文件";
    }

    // 基准路径：src/
    const srcDir = dirname(fileURLToPath(import.meta.url));
    const baseDir = resolve(srcDir, "..");
    const fullPath = resolve(baseDir, filepath);

    // 路径穿越防护
    if (fullPath !== baseDir && !fullPath.startsWith(baseDir + sep)) {
        return "非法路径，禁止访问上级目录";
    }

    // 白名单校验
    const whitelist = config.runJsDirs || [];
    const allowed = whitelist.some(dir => {
        const allowedDir = resolve(baseDir, dir);
        return fullPath === allowedDir || fullPath.startsWith(allowedDir + sep);
    });

    if (!allowed) {
        return `无权执行该路径，仅允许执行以下目录中的脚本：${whitelist.join(", ")}`;
    }

    try {
        // 在子进程中执行脚本，参数通过 process.argv[2] 以 JSON 形式传递
        const args = param?.args ?? {};
        const argsJson = JSON.stringify(args);

        const { stdout, stderr } = await new Promise((resolve, reject) => {
            execFile(process.execPath, [fullPath, argsJson], { timeout: 30000 }, (error, stdout, stderr) => {
                if (error) {
                    if (stderr) reject(new Error(stderr.trim()));
                    else reject(error);
                }
                else {
                    resolve({ stdout, stderr });
                }
            });
        });
        const output = stdout.trim();
        if (output) return output;
        if (stderr.trim()) return `脚本执行完成，但有警告输出:\n${stderr.trim()}`;
        return "脚本执行成功（无输出）";
    }
    catch (err) {
        if (err.code === "ENOENT") {
            return `脚本文件 "${filepath}" 不存在`;
        }
        if (err.killed) {
            return "脚本执行超时（30秒限制）";
        }
        return `脚本执行失败: ${err.message}`;
    }
}


const toolMap = new Map(
    [
        ["test_function", testTool],
        ["get_memory", getMemory],
        ["get_user_profile", getUserProfileTool],
        ["read_file", readFile],
        ["run_JS", runJS],
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
    return `${name}调用结果:\n${await tool(parameter)}`;
}


