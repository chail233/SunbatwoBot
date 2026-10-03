import chatRecorder from "./recorder.js";
import {makeMemoryUserId, searchMemory, getUserProfile} from "./long-term-memory.js";
import config from "../config.js";
import logger from "../utils/logger.js";

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



const toolMap = new Map(
    [
        ["test_function", testTool],
        ["get_memory", getMemory],
        ["get_user_profile", getUserProfileTool],
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
    return await tool(parameter);
}