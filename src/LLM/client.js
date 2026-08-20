// @ts-check

import axios from "axios";
import config from "../config/index.js";
import logger from "../utils/logger.js";
import { LLM_API_URL, LLM_TIMEOUT } from "../consts.js";

/**
 * 统一的 LLM API 客户端
 * 封装阿里云百炼兼容接口的 HTTP 调用
 */

/** axios 实例 */
const http = axios.create({
    baseURL: LLM_API_URL,
    timeout: LLM_TIMEOUT,
    headers: {
        Authorization: `Bearer ${config.aiAPIKEY}`,
        "Content-Type": "application/json",
    },
});

/**
 * 调用 LLM 聊天补全接口
 * @param {object} options
 * @param {string} options.model 模型名
 * @param {Array<object>} options.messages 消息列表
 * @param {number} [options.temperature] 温度
 * @param {boolean} [options.enableSearch] 是否启用联网搜索
 * @param {object} [options.responseFormat] 响应格式，如 { type: "json_object" }
 * @returns {Promise<{content: string, totalTokens: number}|null>}
 *   成功返回 { content, totalTokens }，失败返回 null
 */
export async function callLLM({ model, messages, temperature, enableSearch, responseFormat }) {
    try {
        const data = {
            model,
            messages,
            ...(temperature !== undefined && { temperature }),
            ...(enableSearch && { enable_search: true }),
            ...(responseFormat && { response_format: responseFormat }),
        };

        const resp = await http.post("", data);
        const body = resp.data;

        if (!body?.choices?.[0]?.message?.content) {
            logger.error("LLM 返回格式异常:", body);
            return null;
        }

        logger.debug("LLM 响应:", body);
        return {
            content: body.choices[0].message.content,
            totalTokens: body.usage?.total_tokens ?? 0,
        };
    } catch (err) {
        const detail = err.response?.data?.error?.message || err.message;
        logger.error("LLM API 调用失败:", detail);
        return null;
    }
}