// @ts-check

import {CHAT_HISTORY_LIMIT, CHAT_MODEL} from "../consts.js";
import { callLLM } from "./client.js";
import config from "../config/index.js";

/**
 * 对话上下文管理器（三层记忆）
 *
 * 记忆层级：
 * - 短期记忆（_messages）：最近的消息，超出 limit 则裁剪
 * - 中期缓存（_cache）：被挤出短期的消息暂存区
 * - 中期概括（_midSummary）：缓存满时由 LLM 概括生成
 */
export class ChatRecorder {
    /**
     * @param {number} [limit] 最大消息条数
     */
    constructor(limit = CHAT_HISTORY_LIMIT) {
        /** @type {Array<{role: string, content: string}>} */
        this._messages = [];
        /** @type {Array<{role: string, content: string}>} */
        this._cache = [];
        /** @type {string} 中期记忆概括文本 */
        this._midSummary = "";
        this._limit = limit;
        this._needsSummarization = false;
    }

    /**
     * 添加一条消息
     * 超出短期限制的消息自动进入中期缓存
     * @param {{role: string, content: string}} msg
     */
    add(msg) {
        if (msg.content === "") return;
        this._messages.push(msg);
        while (this._messages.length > this._limit) {
            const evicted = this._messages.shift();
            this._cache.push(evicted);
        }
        if (this._cache.length >= this._limit && !this._needsSummarization) {
            this._needsSummarization = true;
        }
    }

    /** 获取所有短期消息的副本 */
    getAll() {
        return [...this._messages];
    }

    /** 获取中期概括文本 */
    getMidSummary() {
        return this._midSummary;
    }

    /**
     * 执行缓存概括（如果需要）
     * 异步调用 LLM 概括缓存中的对话，更新中期概括文本
     */
    async summarizeCache() {
        if (!this._needsSummarization || this._cache.length === 0) return;

        const result = await callLLM({
            model: CHAT_MODEL,
            messages: [
                {
                    role: "system",
                    content:
                        "请用中文简要概括以下对话历史中提到的关键信息，包括讨论过的话题、用户的偏好或特征、" +
                        "已作出的决定或承诺等。保持简洁，保留最重要的事实，不要添加原文没有的信息。" +
                        "只输出一段文本信息，不要有其他结构化信息",
                },
                ...this._cache.map((m) => ({ role: m.role, content: m.content })),
            ],
            temperature: 0.3,
            enableSearch:false
        });

        if (result) {
            this._midSummary = result.content;
        }

        this._cache = [];
        this._needsSummarization = false;
    }

    /** 清空所有记忆（短期、缓存、概括） */
    clear() {
        this._messages = [];
        this._cache = [];
        this._midSummary = "";
        this._needsSummarization = false;
    }

    /** 当前短期消息数量 */
    get length() {
        return this._messages.length;
    }
}

/** 默认单例实例 */
export const chatRecorder = new ChatRecorder();

export default chatRecorder;