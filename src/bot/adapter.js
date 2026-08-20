// @ts-check

import logger from "../utils/logger.js";

/**
 * OneBot 协议适配器
 * 包装一个 WebSocket 连接，提供事件接收和动作发送的抽象接口
 */
export class OneBotAdapter {
    /**
     * @param {import("ws").WebSocket} ws 原始 WebSocket 连接
     */
    constructor(ws) {
        this.ws = ws;
        this._eventHandler = null;
        this._closed = false;

        ws.on("message", (data) => {
            try {
                const event = JSON.parse(data.toString());
                logger.debug("收到事件:", event.post_type, event.message_type);
                if (this._eventHandler) {
                    this._eventHandler(event);
                }
            } catch (err) {
                logger.error("解析事件 JSON 失败:", err);
            }
        });

        ws.on("close", () => {
            logger.info("WebSocket 连接关闭");
            this._closed = true;
        });

        ws.on("error", (err) => {
            logger.error("WebSocket 连接错误:", err);
        });
    }

    /**
     * 注册事件处理器
     * @param {(event: object) => void | Promise<void>} handler
     */
    onEvent(handler) {
        this._eventHandler = handler;
    }

    /**
     * 发送 OneBot 动作
     * @param {{action: string, params: object, echo?: string}} actionObj
     */
    sendAction(actionObj) {
        if (this._closed) {
            logger.warn("连接已关闭，无法发送动作:", actionObj.action);
            return;
        }
        const payload = JSON.stringify(actionObj);
        logger.debug("发送动作:", actionObj.action);
        this.ws.send(payload);
    }

    /**
     * 便捷方法：发送群消息
     * @param {string|number} groupId
     * @param {string|object|Array} message
     */
    sendGroupMsg(groupId, message) {
        this.sendAction({
            action: "send_group_msg",
            params: { group_id: groupId, message },
        });
    }

    /** 获取原始 WebSocket 实例（用于与旧模块兼容） */
    get rawWs() {
        return this.ws;
    }

    /** 连接是否已关闭 */
    get closed() {
        return this._closed;
    }
}