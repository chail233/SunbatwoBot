// @ts-check

import { callLLM } from "./client.js";
import { chatRecorder } from "./recorder.js";
import { nowTime } from "../utils/time.js";
import config from "../config.js";
import logger from "../utils/logger.js";
import tools from "./tools.js";
import {callTool} from "./tools.js";

const SYSTEM_PROMPT = config.SYSTEM_PROMPT;

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

    let result = await callLLM({
        model: config.CHAT_MODEL,
        messages,
        temperature: 0.2,
        enableSearch: true,
        responseFormat: { type: "json_object" },
        tools: tools,
    });

    if (!result || typeof result === "string") {
        return typeof result === "string" ? "ERROR:" + result : "ERROR:AI 服务无响应";
    }


    let toolDepth = 0;

    while (result?.message?.tool_calls && toolDepth < 10){
        toolDepth++;
        for(const tool_call of result.message.tool_calls){
            try {
                const tool_call_id = tool_call.id;
                const tool_name = tool_call.function.name;
                const tool_args = JSON.parse(tool_call.function.arguments);
                const tool_result = await callTool(tool_name, tool_args);
                chatRecorder.add({role: "tool", content: { text: tool_result, time: nowTime() }, tool_call_id: tool_call_id});
                logger.info("调用工具:", tool_name, " 参数：", tool_args, " 结果：", tool_result);
            }
            catch (err) {
                logger.error("AI 工具调用失败:", err);
                return `ERROR:工具调用失败 - ${err.message}`;
            }
        }
        // 重建消息列表
        const updatedMessages = [
            { role: "system", content: SYSTEM_PROMPT },
            ...(chatRecorder.getMidSummary()
                ? [{ role: "system", content: `对话历史概要：${chatRecorder.getMidSummary()}` }]
                : []),
            ...chatRecorder.getAll(),
        ];
        result = await callLLM({
            model: config.CHAT_MODEL,
            messages: updatedMessages,
            temperature: 0.2,
            enableSearch: true,
            responseFormat: { type: "json_object" },
            tools: tools,
        });
        if (typeof result === "string") {
            return "ERROR:"+result;
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
        chatRecorder.add({ role: "assistant", content:parsed});
    }

    return {
        acts: parsed.action??[],
        tokens: result.totalTokens,
    };
}