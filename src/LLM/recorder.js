// @ts-check

import config from "../config.js";
import { callLLM } from "./client.js";
import { addMemory, makeMemoryUserId, extractUserProfile } from "./long-term-memory.js";
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
    constructor(limit = config.CHAT_HISTORY_LIMIT) {
        this._messages = [];
        this._cache = [];
        this._midSummary = "";
        this._limit = limit;
        this._needsSummarization = false;
    }

    msgWithoutChat = 0;

    /**
     * 添加一条消息
     * content 统一为对象格式：{ text, ...其他字段 }
     * 超出短期限制的消息自动进入中期缓存
     */
    add(msg) {
        const realText = (msg.content?.text ?? "").replace(/[\s\u3000\u200b\u200c\u200d]/g, '');
        if (realText === "") return;

        this._messages.push(msg);
        while (this._messages.length > this._limit) {
            const evicted = this._messages.shift();
            this._cache.push(evicted);
        }
        if (this._cache.length >= this._limit && !this._needsSummarization) {
            this._needsSummarization = true;
        }
    }

    /** 获取所有短期消息的副本（content 序列化为字符串） */
    getAll() {
        return this._messages.map((msg) => {
            const { content, ...rest } = msg;
            return { ...rest, content: JSON.stringify(content) };
        });
    }

    /** 获取中期概括文本 */
    getMidSummary() {
        return this._midSummary;
    }

    /**
     * 执行缓存概括
     * 异步调用 LLM 概括缓存中的对话，更新中期概括文本。
     * 在覆盖旧概括前，会先将旧的概括内容存入长期记忆。
     */
    async summarizeCache() {
        if (!this._needsSummarization || this._cache.length === 0) return;

        // 1. 如果存在旧的概括，先存入长期记忆（放在 messages 中，标注为对话摘要）
        if (this._midSummary) {
            const userId = makeMemoryUserId(config.targetGroupId);
            await addMemory(userId, [
                { role: "user", content: `对话摘要：${this._midSummary}` },
            ]);
        }

        // 2. 按用户分组提取画像
        await this._extractProfilesFromCache();

        // 3. 生成新的概括
        let userMsgs = "";
        for(let i=0;i<this._cache.length;i++) {
            const msg = this._cache[i];
            const text = msg.content?.text ?? "";
            userMsgs += `${i+1}.`;
            if(msg.role==="user"){
                userMsgs += text + "\n";
            }
            if(msg.role==="assistant"){
                userMsgs += "\u6211:" + text + "\n";
            }
        }
        const result = await callLLM({
            model: config.CHAT_MODEL,
            messages: [
                {
                    role: "user",
                    content:
                        "请用中文简要概括以下对话历史中提到的关键信息，包括讨论过的话题、角色的偏好或特征、" +
                        "已作出的决定或承诺等。保持简洁，保留最重要的事实，不要添加原文没有的信息。" +
                        "每一条描述都必须有一个主体，不能直接用用户来指代角色。" +
                        "只输出一段文本信息，不要有其他结构化信息",
                },
                {
                    role: "user",
                    content: userMsgs
                }
            ],
            temperature: 0.2,
            enableSearch:false
        });

        if (result) {
            this._midSummary = result.message.content;
        }

        this._cache = [];
        this._needsSummarization = false;
    }

    /**
     * 从缓存中按用户分组提取画像
     * 将缓存中的 user 消息按 content.qq（QQ 号）分组，每组单独调用画像提取
     */
    async _extractProfilesFromCache() {
        /** @type {Map<string, Array<{role: string, content: string}>>} */
        const userMessagesMap = new Map();

        for (const msg of this._cache) {
            if (msg.role === "user" && msg.content?.qq) {
                const qq = msg.content.qq;
                if (!userMessagesMap.has(qq)) {
                    userMessagesMap.set(qq, []);
                }
                userMessagesMap.get(qq).push({
                    role: "user",
                    content: JSON.stringify(msg.content),
                });
            }
        }

        // 对每个用户分别提取画像
        for (const [qq, msgs] of userMessagesMap) {
            if (msgs.length > 0) {
                await extractUserProfile(qq, msgs.slice(-20));
            }
        }
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