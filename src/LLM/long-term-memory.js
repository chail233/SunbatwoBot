// @ts-check

import axios from "axios";
import config from "../config/index.js";
import logger from "../utils/logger.js";
import {
    MEMORY_API_BASE_URL,
    MEMORY_SEARCH_TOP_K,
    MEMORY_MIN_SCORE,
    MEMORY_USER_ID_PREFIX,
    LLM_TIMEOUT,
} from "../consts.js";

/**
 * 长期记忆 API 封装（阿里云百炼记忆库）
 *
 * 功能：
 * - addMemory(userId, messages) — 添加事实记忆
 * - searchMemory(userId, messages, options?) — 搜索事实记忆
 */

/** axios 实例（独立的 HTTP 客户端，指向记忆库 API） */
const http = axios.create({
    baseURL: MEMORY_API_BASE_URL,
    timeout: LLM_TIMEOUT,
    headers: {
        Authorization: `Bearer ${config.aiAPIKEY}`,
        "Content-Type": "application/json",
    },
});

/**
 * 构造记忆实体 ID
 * @param {string} groupId 群号
 * @returns {string} 例如 "SunBot199243777"
 */
export function makeMemoryUserId(groupId) {
    return `${MEMORY_USER_ID_PREFIX}${groupId}`;
}

/**
 * 添加事实记忆
 *
 * @param {string} userId 记忆实体 ID
 * @param {Array<{role: string, content: string}>} messages 对话消息列表（最多 50 条）
 * @returns {Promise<boolean>} 成功返回 true，失败返回 false（静默失败）
 */
export async function addMemory(userId, messages) {
    try {
        const payload = {
            user_id: userId,
            messages,
        };

        const resp = await http.post("/add", payload);
        const body = resp.data;

        if (body?.memory_nodes) {
            logger.debug(
                `长期记忆添加成功: ${body.memory_nodes.length} 条事实记忆`,
            );
            return true;
        }

        logger.warn("长期记忆添加返回格式异常:", body);
        return false;
    } catch (err) {
        const detail = err.response?.data?.message || err.message;
        logger.warn("长期记忆添加失败（不影响主流程）:", detail);
        return false;
    }
}

/**
 * 搜索事实记忆
 *
 * @param {string} userId 记忆实体 ID
 * @param {Array<{role: string, content: string}>} messages 对话消息（用作查询上下文）
 * @param {object} [options]
 * @param {number} [options.topK] 最大召回数量（默认 consts 中定义）
 * @param {number} [options.minScore] 最小相似度阈值（默认 consts 中定义）
 * @param {string} [options.planVersion] Pro 或 Lite（默认 Lite）
 * @returns {Promise<Array<string>>} 召回的记忆内容数组，为空表示无相关记忆
 */
export async function searchMemory(userId, messages, options = {}) {
    const {
        topK = MEMORY_SEARCH_TOP_K,
        minScore = MEMORY_MIN_SCORE,
        planVersion = "Lite",
    } = options;

    try {
        const payload = {
            user_id: userId,
            messages,
            top_k: topK,
            min_score: minScore,
            plan_version: planVersion,
        };

        const resp = await http.post("/memory_nodes/search", payload);
        const body = resp.data;

        if (!body?.memory_nodes?.length) {
            return [];
        }

        // 按相似度排序并过滤，提取内容
        const results = body.memory_nodes
            .filter((node) => (node.score ?? 1) >= minScore)
            .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
            .map((node) => node.content)
            .filter(Boolean);

        logger.debug(`长期记忆召回: ${results.length} 条结果`);
        return results;
    } catch (err) {
        const detail = err.response?.data?.message || err.message;
        logger.warn("长期记忆搜索失败（不影响主流程）:", detail);
        return [];
    }
}