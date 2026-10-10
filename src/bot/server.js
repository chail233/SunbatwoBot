import { timingSafeEqual } from "node:crypto";
import { WebSocketServer } from "ws";
import config from "../config.js";
import logger from "../utils/logger.js";
import { OneBotAdapter } from "./adapter.js";

const ONEBOT_PATH = "/onebot/v11/ws";
const PLACEHOLDER_TOKEN = "your_token_here";

/**
 * Reject missing and default placeholder credentials before opening the listener.
 * @param {string|null|undefined} token
 * @returns {token is string}
 */
function hasConfiguredToken(token) {
    return typeof token === "string" && token.trim().length > 0 && token.trim() !== PLACEHOLDER_TOKEN;
}

/**
 * Validate either supported OneBot WebSocket credential without logging it.
 * @param {import("node:http").IncomingMessage} request
 * @param {string|null|undefined} configuredToken
 * @returns {boolean}
 */
export function isAuthorizedOneBotRequest(request, configuredToken) {
    if (!hasConfiguredToken(configuredToken)) return false;

    const authorization = request.headers.authorization;
    const headerToken = typeof authorization === "string"
        ? authorization.match(/^Bearer\s+(.+)$/i)?.[1]?.trim() ?? null
        : null;
    const queryToken = new URL(request.url ?? "/", "http://localhost").searchParams.get("access_token");
    const expected = Buffer.from(configuredToken);

    return [headerToken, queryToken].some(candidate => {
        if (candidate === null) return false;
        const received = Buffer.from(candidate);
        return received.length === expected.length && timingSafeEqual(received, expected);
    });
}

/**
 * 启动 OneBot WebSocket 服务
 * NapCat 作为客户端连接到此服务
 *
 * @param {(event: object, adapter: OneBotAdapter) => void | Promise<void>} onEvent
 *   事件处理回调，收到事件时调用
 * @returns {WebSocketServer} WebSocket 服务器实例
 */
export function startOneBotServer(onEvent) {
    if (!hasConfiguredToken(config.token)) {
        throw new Error("A non-placeholder OneBot token is required for the WebSocket server.");
    }

    const host = config.wsHost || "127.0.0.1";
    const wss = new WebSocketServer({
        host,
        port: config.wsPort,
        path: ONEBOT_PATH,
        verifyClient: ({ req }) => isAuthorizedOneBotRequest(req, config.token),
    });

    wss.on("connection", (ws) => {
        logger.info(`NapCat 已连接 (端口: ${config.wsPort})`);

        const adapter = new OneBotAdapter(ws);

        adapter.onEvent(async (event) => {
            try {
                await onEvent(event, adapter);
            }
            catch (err) {
                logger.error("事件处理出错:", err);
            }
        });
    });

    wss.on("listening", () => {
        logger.info(`WebSocket 服务已启动: ${host}:${config.wsPort}${ONEBOT_PATH}`);
    });

    wss.on("error", (err) => {
        logger.error("WebSocket 服务错误:", err);
    });

    return wss;
}
