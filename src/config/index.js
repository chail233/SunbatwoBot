// @ts-check
import dotenv from "dotenv";
dotenv.config();

/**
 * 统一配置模块
 * 所有环境变量在此集中读取、校验，并提供默认值
 */

function required(key) {
    const val = process.env[key];
    if (!val) {
        console.error(`[config] 缺少必需的环境变量: ${key}`);
        process.exit(1);
    }
    return val;
}

const config = {
    /** WebSocket 服务端口 */
    wsPort: Number(process.env.WS_PORT) || 8080,

    /** OneBot 鉴权 Token */
    token: process.env.ONEBOT_TOKEN || "",

    /** NapCat HTTP API 地址（不含协议前缀） */
    napcatHttpHost: process.env.HTTP_SERVER || "127.0.0.1:3000",

    /** 目标群 ID */
    targetGroupId: process.env.TARGET_GROUP_ID || "",

    /** 机器人自身 QQ 号 */
    selfId: process.env.BOT_SELF_ID,

    /** 主人 QQ 号 */
    owner: process.env.OWNER || "",

    /** 阿里云 AI API Key */
    aiAPIKEY: process.env.AI_APIKEY || "",

    /** 和风天气 Key */
    qweatherKEY: process.env.QWEATHER_KEY || "",
};

export default config;