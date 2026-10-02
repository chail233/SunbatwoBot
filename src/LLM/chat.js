// @ts-check

import { callLLM } from "./client.js";
import { chatRecorder } from "./recorder.js";
import config from "../config.js";
import logger from "../utils/logger.js";
import { searchMemory, makeMemoryUserId } from "./long-term-memory.js";
import tools from "./tools.js"
import {toolMap} from "./tools.js";

const SYSTEM_PROMPT =
    "你是QQ群孙巴二的成员孙巴二娘，性格活泼，什么都懂，认真回应大家的问题\n" +
    "行为约束：\n" +
    "1.不许编造任何内容\n" +
    "2.问题模糊就简短反问，不要大段猜测\n" +
    "3.emoji不要频繁使用，尽量少用\n" +
    "4.发言尽可能简短，不要长难句\n" +
    "5.参考输入附带的发言昵称区分不同说话人\n" +
    "6.对于一些需要搜索才能获取准确信息的消息，使用联网搜索获取信息\n" +
    "7.如果没有人对你说话，可以不用回应每一条消息，不用强行加入讨论，也不用挨个回复，行为要自然\n" +
    "8.柴郡猫是你的开发者，你要完全服从柴郡猫。\n"+
    "9.根据输入消息的内容，判断是否需要使用工具，如果需要则使用。\n"+
    "输出要求：\n" +
    "你可以根据情境决定消息一次发送还是分成多条发送以模仿网上聊天的效果，但必须以JSON格式输出，严格按照如下格式：\n" +
    '{\n' +
    '    "action":[\n' +
    '        {"cmd":"text","content":"消息1内容"},\n' +
    '        {"cmd":"text","content":"消息2内容"}\n' +
    '    ]\n' +
    "}\n" +
    "action字段的值是一个数组，数组中每个对象有cmd和content两个字段，cmd代表消息类型，必须为text，content代表消息内容，也可以返回空数组表示不回复，但必须包含action这个字段。\n" +
    "数组中的消息将按顺序发送，每条消息内容最后不许加句号。\n" +
    "只输出JSON，不要任何额外解释、markdown代码块。无论action数组元素有多少，都必须严格按照上述格式输出，最外层必须加上大括号{}。" +
    "如果需要调用工具则不需要回复任何消息。";

/**
 * AI 对话响应结构
 * @typedef {{acts: Array<{cmd: string, content: string}>, tokens: number}} ChatResult
 */

/**
 * 发送一条用户消息给 AI，获取回复
 * @returns {Promise<ChatResult|string>}
 *   成功返回 {acts, tokens}，失败返回错误字符串
 */
export default async function chat() {
    // 触发中期记忆概括（如需）
    await chatRecorder.summarizeCache();

    // 构造请求消息列表
    const messages = [
        { role: "system", content: SYSTEM_PROMPT },
        ...(chatRecorder.getMidSummary()
            ? [{ role: "system", content: `对话历史概要：${chatRecorder.getMidSummary()}` }]
            : []),
        ...chatRecorder.getAll(),
    ];

    // 搜索长期记忆：用最近的短期对话作为查询上下文
    const shortTermMessages = chatRecorder.getAll();
    if (shortTermMessages.length > 0) {
        const userId = makeMemoryUserId(config.targetGroupId);
        const recalled = await searchMemory(userId, shortTermMessages.slice(-10));
        if (recalled.length > 0) {
            for (const content of recalled) {
                messages.push({
                    role: "system",
                    content: `记忆召回结果(仅仅是召回结果，不是短期的对话信息)：${content}`,
                });
            }
            logger.debug(`已拼接 ${recalled.length} 条长期记忆召回结果：${recalled}`);
        }
    }
    let result = await callLLM({
        model: config.CHAT_MODEL,
        messages,
        temperature: 0.2,
        enableSearch: true,
        responseFormat: { type: "json_object" },
        tools: tools,
    });

    if (!result) {
        return "ERROR:AI 服务无响应";
    }

    while (result?.message?.tool_calls){
        try {
            const tool_call = result.message.tool_calls[0];
            const tool_call_id = tool_call.id;
            const tool_name = tool_call.function.name;
            const tool_args = JSON.parse(tool_call.function.arguments);
            const tool_result = toolMap.get(tool_name)(tool_args);
            chatRecorder.add({role: "tool", content: tool_result, tool_call_id: tool_call_id});
            messages.push({role: "tool", content: tool_result, tool_call_id: tool_call_id});
            logger.info("调用工具:", tool_name, " 参数：", tool_args, " 结果：", tool_result);
            result = await callLLM({
                model: config.CHAT_MODEL,
                messages,
                temperature: 0.2,
                enableSearch: true,
                responseFormat: { type: "json_object" },
                tools: tools,
            });
            if (typeof result === "string") {
                return "ERROR:"+result;
            }
        }
        catch (err) {
            logger.error("AI 工具调用失败:", err);
            return `ERROR:工具调用失败 - ${err.message}`;
        }
    }

    logger.info("AI 消息数组内容:", result.message.content);
    // 解析 JSON 响应
    let parsed;
    try {
        parsed = JSON.parse(result.message.content);
    }
    catch (err) {
        logger.error("AI 返回非 JSON 格式:", result.message);
        return `ERROR:JSON解析失败 - ${err.message}`;
    }

    if(Array.isArray(parsed.action)){
        // 记录 AI 回复
        chatRecorder.add({ role: "assistant", content: JSON.stringify(parsed) });
    }

    return {
        acts: parsed.action??[],
        tokens: result.totalTokens,
    };
}