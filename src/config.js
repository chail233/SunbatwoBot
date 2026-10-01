// @ts-check

/**
 * 统一配置模块
 * 整合所有配置：基础配置、常量、成员映射
 *
 * DevMode 为 true 时，从 configDev.js 加载开发环境配置
 */

import { existsSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

const baseConfig = {
    // ========== 开发模式开关 ==========

    /** 为 true 时从 configDev.js 加载开发环境配置 */
    DevMode: true,

    // ========== 基础配置 ==========

    /** WebSocket 服务端口 */
    wsPort: 8080,

    /** OneBot 鉴权 Token */
    token: "your_token_here",

    /** NapCat HTTP API 地址（不含协议前缀） */
    napcatHttpHost: "127.0.0.1:3000",

    /** 目标群 ID */
    targetGroupId: "your_group_id",

    /** 机器人自身 QQ 号 */
    selfId: "your_bot_qq",

    /** 主人 QQ 号 */
    owner: "your_owner_qq",

    /** 阿里云 AI API Key */
    aiAPIKEY: "your_ai_api_key",

    /** 和风天气 Key */
    qweatherKEY: "your_qweather_key",

    // ========== 全局常量 ==========

    /** 对话上下文最大记录条数 */
    CHAT_HISTORY_LIMIT: 30,

    /** 无主动对话时，多少条消息后触发主动聊天 */
    PROACTIVE_CHAT_LIMIT: 15,

    /** LLM API 基础地址 */
    LLM_API_URL: "https://workspace.aliyuncs.com",

    /** 聊天模型名称 */
    CHAT_MODEL: "deepseek-v4.1-flash",

    /** 识图模型名称 */
    VISION_MODEL: "qwen3.7-flash",

    /** 模型接口超时（毫秒） */
    LLM_TIMEOUT: 60000,

    /** 一言 API 限流：时间窗口 */
    SENTENCE_LIMIT_TIME: 10000,

    /** 一言 API 限流：窗口内最大次数 */
    SENTENCE_LIMIT_COUNT: 3,

    /** 复读检测队列长度 */
    REPEATER_QUEUE_SIZE: 10,

    /** 和风天气查询url */
    QW_BASE_URL: "https://m454e6xkq4.re.qweatherapi.com/v7",

    /** 和风城市id查询url */
    QW_GEO_BASE: "https://m454e6xkq4.re.qweatherapi.com/geo/v2",

    /** 长期记忆 API 基础地址 */
    MEMORY_API_BASE_URL: "https://workspace.aliyuncs.com/api/v2/apps/memory",

    /** 长期记忆搜索：最大召回数量 */
    MEMORY_SEARCH_TOP_K: 10,

    /** 长期记忆搜索：最小相似度阈值 */
    MEMORY_MIN_SCORE: 0.3,

    /** 长期记忆：记忆实体 ID 前缀（后接群号） */
    MEMORY_USER_ID_PREFIX: "SunBot",

    // ========== 成员映射 ==========

    /**
     * QQ 号 → 群昵称 映射表
     * 用于在 AI 对话上下文中显示发言人名称
     */
    members: new Map([
    ]),
};

// DevMode 为 true 时，合并 configDev.js 中的配置
if (baseConfig.DevMode) {
    const devConfigPath = join(__dirname, "configDev.js");
    if (existsSync(devConfigPath)) {
        const devConfig = (await import(pathToFileURL(devConfigPath).href)).default;
        Object.assign(baseConfig, devConfig);
    } else {
        console.error("[config] DevMode 为 true，但找不到 configDev.js");
        process.exit(1);
    }
}

export default baseConfig;
