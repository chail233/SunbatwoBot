# SunbatwoBot

这是一个基于 NapCat + OneBot v11 协议的 QQ 机器人服务端。包含了一些已经开发好的功能，
如关键词识别、执行指令、ai对话等。

该项目的AI对话还在继续开发中，目前已经支持识别图片内容，区别不同的发言人，主动发言，发送多条消息，
联网搜索...

你可以快速地配置并使用该项目，或者扩展开发自己想要的功能。

## 快速开始

### 环境要求

- Node.js >= 18
- NapCat 客户端已运行并配置好反向 WebSocket 连接（详见NapCat文档）

### 获取代码与安装依赖
``` bash
# 拉取代码
git clone https://github.com/chail233/SunbatwoBot
# 安装依赖
npm install
```

### 配置

创建 `.env` 文件并填写配置：

```env
# WebSocket 服务端口（NapCat 反向连接端口）
WS_PORT=8080

# OneBot 鉴权 Token（需与 NapCat 配置一致）
ONEBOT_TOKEN=your_token_here

# 机器人 QQ 号
BOT_SELF_ID=1234567890

# 主人 QQ 号（管理员命令使用）
OWNER=1234567890

# 目标群 ID（机器人只处理该群消息）
TARGET_GROUP_ID=123456789

# NapCat HTTP API 地址（用于 get_image 等 HTTP 操作）
HTTP_SERVER=127.0.0.1:3000

# 阿里云百炼 API Key（用于 AI 对话和识图）
AI_APIKEY=sk-xxx

# 和风天气 API Key（用于天气查询）
QWEATHER_KEY=your_key_here
```

在`consts.js`中配置所需的url，以及更改运行时常量。如果不需要某些功能，可以只填写占位符。
``` js
/** 对话上下文最大记录条数 */
export const CHAT_HISTORY_LIMIT = 50;

/** 无主动对话时，多少条消息后触发主动聊天 */
export const PROACTIVE_CHAT_LIMIT = 10;

/** LLM API 基础地址 */
export const LLM_API_URL =
    "https://ws-j92tdnb3txh89s68.cn-beijing.maas.aliyuncs.com/compatible-mode/v1/chat/completions";

/** 聊天模型名称 */
export const CHAT_MODEL = "deepseek-v4-flash";

/** 识图模型名称 */
export const VISION_MODEL = "qwen3.7-plus";

/** 聊天接口超时（毫秒） */
export const LLM_TIMEOUT = 30000;

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
```

### 启动

```bash
npm start
# 或
node src/index.js
```

NapCat 配置反向 WebSocket 连接地址：`ws://127.0.0.1:8080/onebot/v11/ws`

如果你的服务端和NapCat不在同一台机器，请填写该服务端所在设备的ip。

---

## 项目结构

```
src/
├── index.js                    # 入口文件：启动服务
│
├── config/
│   └── index.js                # 配置加载：读取 .env，统一校验
│
├── consts.js                   # 全局常量：API 地址、模型名、限制参数
│
├── bot/                        # 机器人通信层
│   ├── server.js               # WebSocket 服务启动
│   ├── adapter.js              # OneBot 协议适配器（收发消息封装）
│   └── actions.js              # 动作构建器（构建 OneBot 动作对象）
│
├── pipeline/                   # 事件处理管道 ← 核心
│   ├── index.js                # 管道编排器：串联中间件 → 处理器
│   ├── context.js              # 上下文构建器：从事件提取通用信息
│   ├── middleware/             # 中间件：全部执行，丰富上下文
│   │   ├── image-recognizer.js # 自动识别图片内容
│   │   ├── at-detector.js      # 检测是否 @机器人
│   │   └── mini-program.js     # 处理小程序/链接分享
│   └── handlers/               # 处理器：按顺序执行，首个命中即停止
│       ├── admin-commands.js   # 管理员命令（/ 前缀）
│       ├── keyword-commands.js # 关键词命令（"来句台词"等）
│       ├── user-commands.js    # 用户命令（# 前缀）
│       ├── ai-chat.js          # AI 对话（@机器人时触发）
│       ├── repeater.js         # 复读检测
│       └── proactive-chat.js   # 主动聊天（消息计数触发）
│
├── llm/                        # AI 语言模型层
│   ├── client.js               # 统一 API 客户端（axios 封装）
│   ├── chat.js                 # 对话 API（含系统提示词）
│   ├── image.js                # 识图 API
│   └── recorder.js             # 对话上下文管理器
│
├── services/                   # 外部服务
│   ├── napcat.js               # NapCat HTTP API 客户端
│   ├── acg.js                  # ACG 图片 API
│   ├── hitokoto.js             # 一言（动漫台词）API
│   └── weather.js              # 和风天气 API
│
├── data/                       # 静态数据
│   ├── members.js              # QQ号 → 昵称映射（注意，这个需要自行配置）
│   └── sunbatwo-girls.js       # 孙巴二娘图片 URL 列表
│
├── tools/                      # 工具函数
│   ├── repeater.js             # 复读检测算法
│   └── runcode.js              # 动态代码执行（仅管理员可用）
│
└── utils/                      # 通用工具
    ├── logger.js               # 统一日志（带时间戳）
    ├── sleep.js                # 延迟
    ├── random.js               # 随机整数
    ├── queue.js                # 队列数据结构
    └── image-type.js           # 图片格式检测（文件头魔数）
```

---

## 架构说明

### 事件处理流程

```
NapCat 发送事件
    │
    ▼
bot/server.js 接收 WebSocket 连接
    │
    ▼
bot/adapter.js 解析 JSON 事件
    │
    ▼
pipeline/index.js 管道编排器
    │
    ├─ 过滤：仅处理 message 事件 + 目标群
    │
    ├─ 中间件（全部执行）
    │   ├─ image-recognizer  → ctx.imageDescription
    │   ├─ at-detector       → ctx.isAtBot
    │   └─ mini-program      → ctx.handled = true（若匹配）
    │
    └─ 处理器（首个返回 true 即停止）
        ├─ admin-commands    → / 前缀，仅管理员
        ├─ keyword-commands  → 精确匹配关键词
        ├─ user-commands     → # 前缀
        ├─ ai-chat           → @机器人时触发
        ├─ repeater          → 复读检测
        └─ proactive-chat    → 记录上下文，达阈值时主动聊天
```

### 上下文对象 (`ctx`)

每个事件在管道中传递的上下文对象包含：

```js
{
    event,          // 原始 OneBot 事件
    adapter,        // OneBotAdapter 实例（用于发送消息）
    text,           // 提取的纯文本
    userId,         // 发送者 QQ 号
    senderName,     // 解析后的昵称
    isAdmin,        // 是否管理员
    isTargetGroup,  // 是否目标群
    isAtBot,        // 是否 @了机器人
    imageDescription, // 图片识别描述
    handled        // 是否已被处理
}
```

### 如何添加新功能

#### 添加关键词命令

在 `pipeline/handlers/keyword-commands.js` 的 `CMD_MAP` 中添加：

```js
CMD_MAP.set("你的关键词", async (ctx) => {
    // ctx.adapter 可发送消息
    // ctx.event 可获取原始事件数据
    ctx.adapter.sendGroupMsg(ctx.event.group_id, "回复内容");
});
```

#### 添加用户命令（# 前缀）

在 `pipeline/handlers/user-commands.js` 的 `USER_CMD_MAP` 中添加：

```js
USER_CMD_MAP.set("命令名", async (args) => {
    // args 是命令参数数组
    return "回复文本";
});
```

#### 添加新中间件

1. 在 `pipeline/middleware/` 下创建文件
2. 导出一个函数，接收 `ctx` 参数并修改它
3. 在 `pipeline/index.js` 的 `middlewares` 数组中注册

```js
// pipeline/middleware/your-feature.js
export default function yourFeature(ctx) {
    // 读取 ctx.event 获取原始数据
    // 写入 ctx.yourField 供后续使用
}
```

#### 添加新服务

在 `services/` 下创建文件，封装外部 API 调用：

```js
// services/your-service.js
import axios from "axios";
import logger from "../utils/logger.js";

export async function yourFunction(params) {
    try {
        const resp = await axios.get("https://api.example.com/endpoint");
        return resp.data;
    } catch (err) {
        logger.error("服务调用失败:", err);
        return null;
    }
}
```

---

## 通信方式

### WebSocket（主要）

- NapCat 以客户端身份连接到本服务的 WebSocket 服务器
- 事件通过 WebSocket 从 NapCat 推送
- 动作通过同一 WebSocket 连接发送回 NapCat

### HTTP（辅助）

- `get_image` 等 NapCat 未通过 WebSocket 暴露的接口使用 HTTP 调用
- 封装在 `services/napcat.js` 中

---

## 依赖关系

```
index.js
  ├─ bot/server.js ── bot/adapter.js ── utils/logger.js
  └─ pipeline/index.js
       ├─ pipeline/context.js ── config/ ── data/members.js
       ├─ pipeline/middleware/
       │    ├─ image-recognizer.js ── services/napcat.js
       │    │                       ── utils/image-type.js
       │    │                       ── llm/image.js
       │    └─ mini-program.js ── llm/recorder.js
       └─ pipeline/handlers/
            ├─ admin-commands.js ── tools/runcode.js
            ├─ keyword-commands.js ── services/acg.js
            │                      ── services/hitokoto.js
            │                      ── data/sunbatwo-girls.js
            │                      ── llm/recorder.js
            ├─ user-commands.js ── services/weather.js
            ├─ ai-chat.js ── llm/chat.js ── llm/client.js
            │              ── llm/recorder.js
            ├─ repeater.js ── tools/repeater.js ── utils/queue.js
            └─ proactive-chat.js ── llm/chat.js
                                 ── llm/recorder.js
```

---

## 开发建议

1. **添加新命令**：优先考虑放在 `pipeline/handlers/` 下的对应处理器中，或创建新的处理器文件并注册到 `pipeline/index.js`
2. **调用外部 API**：在 `services/` 下创建新文件，不要在 handler 中直接写 axios/fetch
3. **日志**：使用 `logger.info/warn/error` 替代 `console.log`
4. **配置**：新增配置项需在 `.env` 和 `config/index.js` 中同步添加
5. **常量**：魔法数字/字符串放在 `consts.js` 中统一管理