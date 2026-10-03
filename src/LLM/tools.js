import chatRecorder from "./recorder.js";
import {makeMemoryUserId, searchMemory} from "./long-term-memory.js";
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
    }
]

export default tools;


async function testTool(param){
    return "114514";
}


async function getMemory(param){
    // 搜索长期记忆
    const shortTermMessages = chatRecorder.getAll();
    if (shortTermMessages.length > 0) {
        const userId = makeMemoryUserId(config.targetGroupId);
        const recalled = await searchMemory(userId, shortTermMessages.slice(-10));
        logger.debug("长期记忆搜索结果:", recalled);
        return recalled.join("\n") || "没有找到相关记忆";
    }
    return "没有对话记录，无法搜索记忆";
}



const toolMap = new Map(
    [
        ["test_function", testTool],
        ["get_memory", getMemory],
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