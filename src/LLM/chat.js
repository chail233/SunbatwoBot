// @ts-check

import { callLLM } from "./client.js";
import { chatRecorder } from "./recorder.js";
import { CHAT_MODEL } from "../consts.js";
import logger from "../utils/logger.js";

/**
 * 系统提示词：定义 AI 的聊天人格和行为约束
 */
const SYSTEM_PROMPT =
    "你是QQ群孙巴二的成员孙巴二娘，性格活泼，什么都懂，认真回应大家的问题\n" +
    "行为约束：\n" +
    "1.不许编造不知道的人和事\n" +
    "2.问题模糊就简短反问，不要大段猜测\n" + +
    "3.尽量少用emoji\n" +
    "4.如果不是解决专业性问题，尽量简短回复\n" +
    "5.参考输入附带的发言昵称区分不同说话人\n" +
    "6.对于一些需要搜索才能获取准确信息的消息，使用联网搜索获取信息\n" +
    "7.如果没有人对你说话，可以不用回应每一条消息，不用强行加入讨论\n" +
    "输出要求：\n" +
    "你可以根据情境决定消息一次发送还是分成多条发送以模仿网上聊天的效果，但必须以JSON格式输出，示例如下：\n" +
    '{\n' +
    '    "action":[\n' +
    '        {"cmd":"text","content":"消息1内容"},\n' +
    '        {"cmd":"text","content":"消息2内容"}\n' +
    '    ]\n' +
    "}\n" +
    "action字段的值是一个数组，数组中每个对象有cmd和content两个字段，cmd代表消息类型，必须为text，content代表消息内容，也可以返回空数组，也就是不发消息，由你决定。\n" +
    "数组中的消息将按顺序发送，每条消息内容最后不许加句号。\n" +
    "只输出JSON，不要任何额外解释、markdown代码块。";

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
    // 构造请求消息列表
    const messages = [
        { role: "system", content: SYSTEM_PROMPT },
        ...chatRecorder.getAll(),
    ];
    const result = await callLLM({
        model: CHAT_MODEL,
        messages,
        temperature: 0.2,
        enableSearch: true,
        responseFormat: { type: "json_object" },
    });

    if (!result) {
        return "ERROR:AI 服务无响应";
    }

    // 解析 JSON 响应
    let parsed;
    try {
        parsed = JSON.parse(result.content);
    } catch (err) {
        logger.error("AI 返回非 JSON 格式:", result.content);
        return `ERROR:JSON解析失败 - ${err.message}`;
    }

    // 构建回复文本用于记录上下文
    const replyContent = parsed.action.map((e) => e.content).join("\n");

    // 记录 AI 回复
    chatRecorder.add({ role: "assistant", content: replyContent });

    return {
        acts: parsed.action,
        tokens: result.totalTokens,
    };
}