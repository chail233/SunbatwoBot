// @ts-check

/**
 * 全局常量
 * 将魔法数字/字符串集中管理
 */

/** 对话上下文最大记录条数 */
export const CHAT_HISTORY_LIMIT = 50;

/** 无主动对话时，多少条消息后触发主动聊天 */
export const PROACTIVE_CHAT_LIMIT = 15;

/** LLM API 基础地址 */
export const LLM_API_URL =
    "https://ws-j92tdnb3txh89s68.cn-beijing.maas.aliyuncs.com/compatible-mode/v1/chat/completions";

/** 聊天模型名称 */
export let CHAT_MODEL = "deepseek-v4-flash";
globalThis.model = CHAT_MODEL;

/** 识图模型名称 */
export const VISION_MODEL = "qwen3.7-flash";

/** 模型接口超时（毫秒） */
export const LLM_TIMEOUT = 60000;

/** 一言 API 限流：时间窗口 */
export const SENTENCE_LIMIT_TIME = 10000;

/** 一言 API 限流：窗口内最大次数 */
export const SENTENCE_LIMIT_COUNT = 3;

/** 复读检测队列长度 */
export const REPEATER_QUEUE_SIZE = 10;

/** 和风天气查询url */
export const QW_BASE_URL = "https://m454e6xkq4.re.qweatherapi.com/v7";

/**和风城市id查询url */
export const QW_GEO_BASE = "https://m454e6xkq4.re.qweatherapi.com/geo/v2";