// @ts-check

import { CHAT_HISTORY_LIMIT } from "../consts.js";

/**
 * 对话上下文管理器
 * 维护消息历史，自动裁剪超出限制的旧消息
 */
export class ChatRecorder {
    /**
     * @param {number} [limit] 最大消息条数
     */
    constructor(limit = CHAT_HISTORY_LIMIT) {
        /** @type {Array<{role: string, content: string}>} */
        this._messages = [];
        this._limit = limit;
    }

    /**
     * 添加一条消息
     * @param {{role: string, content: string}} msg
     */
    add(msg) {
        this._messages.push(msg);
        while (this._messages.length > this._limit) {
            this._messages.shift();
        }
    }

    /** 获取所有消息的副本 */
    getAll() {
        return [...this._messages];
    }

    /** 清空上下文 */
    clear() {
        this._messages = [];
    }

    /** 当前消息数量 */
    get length() {
        return this._messages.length;
    }
}

/** 默认单例实例 */
export const chatRecorder = new ChatRecorder();

export default chatRecorder;