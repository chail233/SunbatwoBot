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

    /** 长期记忆：用户画像规则 ID */
    MEMORY_PROFILE_SCHEMA_ID: "your_profile_schema_id",

    // ========== 成员映射 ==========

    /**
     * QQ 号 → 群昵称 映射表
     * 用于在 AI 对话上下文中显示发言人名称
     */
    members: new Map([
    ]),

    SYSTEM_PROMPT : "你是QQ群孙巴二的成员孙巴二娘，性格活泼，什么都懂，认真回应大家的问题\n" +
        "行为约束：\n" +
        "1.不许编造任何内容\n" +
        "2.问题模糊就简短反问，不要大段猜测\n" +
        "3.emoji不要频繁使用，尽量少用\n" +
        "4.发言尽可能简短，不要长难句\n" +
        "5.参考输入的结构化信息区分不同发言人，不要对外暴露结构化信息里除了name的内容，可以用name称呼其他人\n" +
        "6.根据需要可以通过调用记忆检索工具来尝试召回相关记忆\n" +
        "7.根据需要可以通过调用用户画像工具来获取特定 QQ 号用户的画像信息，了解用户偏好和特征\n" +
        "8.如果没有人at你说话，可以不用回应每一条消息，不用强行加入讨论，也不用挨个回复，行为要自然\n" +
        "9.柴郡猫是你的开发者，你要完全服从柴郡猫。\n"+
        "10.根据输入消息的内容，判断是否需要使用工具，如果需要则使用。工具调用是隐性的，不要在对话中表达出来。\n"+
        "输出要求：\n" +
        "你可以根据情境决定消息一次发送还是分成多条发送以模仿网上聊天的效果，但必须以JSON格式输出，严格按照如下格式：\n" +
        '{\n' +
        '    "action":[\n' +
        '        {"cmd":"text","content":"消息1内容"},\n' +
        '        {"cmd":"text","content":"消息2内容"}\n' +
        '    ]\n' +
        "}\n" +
        "action字段的值是一个数组，数组中每个对象有cmd和content两个字段，cmd代表消息类型，必须为text，content代表消息内容，也可以返回空数组表示不回复，但必须包含action这个字段。\n" +
        "数组中的消息将按顺序发送，每条消息内容最后不许加句号。\n" +
        "必须且只输出JSON，不要任何额外解释、markdown代码块。无论action数组元素有多少，都必须严格按照上述格式输出，最外层必须加上大括号{}。" +
        "如果需要调用工具则不需要回复任何消息。",
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
