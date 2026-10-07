# SunbatwoBot

<div align="center">

[![GitHub Stars](https://img.shields.io/github/stars/chail233/SunbatwoBot?style=flat-square&logo=github&color=gold)](https://github.com/chail233/SunbatwoBot/stargazers)
[![GitHub Forks](https://img.shields.io/github/forks/chail233/SunbatwoBot?style=flat-square&logo=github)](https://github.com/chail233/SunbatwoBot/forks)
[![GitHub Issues](https://img.shields.io/github/issues/chail233/SunbatwoBot?style=flat-square&logo=github)](https://github.com/chail233/SunbatwoBot/issues)
[![License](https://img.shields.io/github/license/chail233/SunbatwoBot?style=flat-square)](https://github.com/chail233/SunbatwoBot/blob/master/LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D24-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org)
[![OneBot](https://img.shields.io/badge/OneBot-v11-black?style=flat-square)](https://github.com/botuniverse/onebot-11)

</div>

这是一个基于 NapCat + OneBot v11 协议的 QQ 机器人服务端。包含了一些已经开发好的功能，
如关键词识别、执行指令、ai对话等。

该项目的AI对话还在继续开发中，目前已经支持：
- 识别图片内容
- 区别不同的发言人
- 主动发言、发送多条消息
- 联网搜索
- **工具调用（Function Calling）**（AI 可自主判断并调用工具，如检索长期记忆）
- **长期记忆**（基于阿里云百炼记忆库，通过工具调用自动存储和召回对话历史中的关键信息）
- **用户画像**（基于阿里云百炼记忆库画像模板，自动提取并存储用户偏好和特征）
- **Skill 技能系统**（可从 GitHub 安装/卸载技能，AI 通过工具调用读取和执行 Skill 脚本）

你可以快速地配置并使用该项目，或者扩展开发自己想要的功能。

## 快速开始

### 环境要求

- Node.js >= 24
- NapCat 客户端已运行并配置好反向 WebSocket 连接（详见NapCat文档）

### 获取代码与安装依赖
``` bash
# 拉取代码
git clone https://github.com/chail233/SunbatwoBot
# 安装依赖
npm install
```

### 配置

所有配置集中在 `src/config.js` 中，包括基础配置、全局常量和成员映射。

**开发环境：** 将 `config.js` 中的 `DevMode` 设为 `true`，然后在 `src/configDev.js` 中填写真实配置（如 Token、API Key 等）。

**生产环境：** 将 `DevMode` 设为 `false`，直接在 `config.js` 中填写真实配置值。

`configDev.js` 示例：
```js
const configDev = {
    /** OneBot 鉴权 Token */
    token: "your_token_here",

    /** 目标群 ID */
    targetGroupId: "123456789",

    /** 机器人自身 QQ 号 */
    selfId: "1234567890",

    /** 主人 QQ 号 */
    owner: "1234567890",

    /** 阿里云 AI API Key */
    aiAPIKEY: "sk-xxx",

    /** 和风天气 Key */
    qweatherKEY: "your_key_here",

    /** GitHub Token（可选，用于技能管理功能） */
    githubToken: "ghp_xxx",

    /** QQ 号 → 群昵称 映射表 */
    members: new Map([
        ["1234567890", "昵称"],
    ]),
};

export default configDev;
```

`config.js` 中的常量配置（按需修改）：
```js
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

/** 长期记忆：用户画像规则 ID（在百炼平台配置） */
MEMORY_PROFILE_SCHEMA_ID: "your_profile_schema_id",

/** 文件读取工具白名单目录 */
readFileDirs: ["skills", "workspace"],

/** JS 脚本执行白名单目录 */
runJsDirs: ["skills", "workspace"],

/** GitHub Token（可选，用于访问 GitHub API） */
githubToken: null,
```

`config.js` 中的系统提示词配置（`SYSTEM_PROMPT`）：

系统提示词定义了 AI 的角色、行为约束和输出格式。主要包含：
- 角色设定（QQ群成员"孙巴二娘"）
- 行为约束（不编造内容、简短回应、自然发言等）
- 输出格式要求（JSON 格式，支持分条发送消息）

你可以根据需要修改 `SYSTEM_PROMPT` 来自定义 AI 的人设和行为。

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
├── config.js                   # 统一配置：基础配置、常量、成员映射
├── configDev.js                # 开发环境配置（gitignore，覆盖 config.js 中的字段）
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
│       ├── keyword-commands.js # 关键词命令（"来句台词"等）
│       ├── user-commands.js    # 用户命令（# 前缀）
│       ├── ai-chat.js          # AI 对话（@机器人时触发）
│       ├── repeater.js         # 复读检测
│       └── proactive-chat.js   # 主动聊天（消息计数触发）
│
├── llm/                        # AI 语言模型层
│   ├── client.js               # 统一 API 客户端（axios 封装）
│   ├── chat.js                 # 对话 API（含系统提示词 + 工具调用循环）
│   ├── tools.js                # 工具定义与调度（Function Calling）
│   ├── skill.js                # Skill 加载器（扫描 skills 目录，解析元数据）
│   ├── image.js                # 识图 API
│   ├── long-term-memory.js     # 阿里云百炼长期记忆 API 封装
│   └── recorder.js             # 对话上下文管理器（含长期记忆同步）
│
├── services/                   # 外部服务
│   ├── napcat.js               # NapCat HTTP API 客户端
│   ├── acg.js                  # ACG 图片 API
│   ├── hitokoto.js             # 一言（动漫台词）API
│   ├── weather.js              # 和风天气 API
│   └── getModels.js            # 百炼平台模型列表查询
│
├── data/                       # 静态数据
│   └── sunbatwo-girls.js       # 孙巴二娘图片 URL 列表
│
├── tools/                      # 工具函数
│   ├── repeater.js             # 复读检测算法
│
├── skills/                     # Skill 技能目录（AI 可读写）
│   └── skill-manager/          # 内置技能：技能管理器
│
├── workspace/                  # 工作区目录（AI 可读写）
│
└── utils/                      # 通用工具
    ├── logger.js               # 统一日志（带时间戳）
    ├── sleep.js                # 延迟
    ├── random.js               # 随机整数
    ├── queue.js                # 队列数据结构
    ├── time.js                 # 时间处理
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

### 四层记忆系统

AI 对话使用逐层压缩的记忆架构，在上下文窗口限制与长期信息保留之间取得平衡(30条为示例)：

```
短期记忆（_messages）
  │ 最近 30 条对话，超出则挤入缓存
  ▼
中期缓存（_cache）
  │ 达到 30 条时触发 LLM 概括
  ▼
中期概括（_midSummary）
  │ 被新概括覆盖前，自动存入长期记忆
  ▼
长期记忆（阿里云百炼记忆库）
  │ AI 通过工具调用（get_memory）自主检索相关记忆
  ▼
拼入工具调用结果 → 供 LLM 参考
```

**各层级说明：**

| 层级 | 存储位置 | 容量/周期 | 触发条件 |
|------|---------|-----------|----------|
| 短期记忆 | `ChatRecorder._messages`（内存） | 30 条 | 每次对话实时更新 |
| 中期缓存 | `ChatRecorder._cache`（内存） | 满 30 条触发概括 | 短期溢出时 |
| 中期概括 | `ChatRecorder._midSummary`（内存） | 每次概括覆盖 | 缓存满时 LLM 生成 |
| 长期记忆 | 阿里云百炼记忆库（云端） | 无上限 | 旧概括被替换时存入；AI 通过工具调用检索 |

**长期记忆流程：**

1. **添加**：当新的中期概括生成时，旧的概括自动以对话摘要格式通过 `AddMemory` API 存入记忆库，用 `SunBot{群号}` 作为记忆实体 ID
2. **召回**：AI 在对话过程中自主判断是否需要检索记忆，若需要则调用 `get_memory` 工具。工具取最近 10 条有效对话消息（仅 user/assistant 角色）通过 `SearchMemory` API 进行语义检索，召回结果作为工具调用结果返回给 AI

所有长期记忆操作失败均静默处理，不影响原有对话功能。

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

**当前可用关键词：**

| 关键词 | 功能 |
|--------|------|
| `来句台词` | 获取一言动漫台词 |
| `来张图` | 获取 ACG 图片 |
| `来只孙巴二娘` | 获取孙巴二娘图片 |
| `来只牛魔` | 获取牛魔图片 |

#### 添加用户命令（# 前缀）

在 `pipeline/handlers/user-commands.js` 的 `cmds` 数组中添加：

```js
{
    name: "命令名",
    description: "命令描述",
    params: [{ name: "参数名", desc: "参数说明" }],  // 无参数则为空数组
    handler: async (args, ctx) => {
        // args 是命令参数数组
        // ctx 是管道上下文
        return "回复文本";
    }
}
```

**当前可用命令：**

| 命令 | 说明 | 参数 | 权限 |
|------|------|------|------|
| `#gw <城市>` | 查询天气 | 城市名称 | 无 |
| `#clear` | 清除短期记忆 | 无 | 管理员 |
| `#help` | 显示指令列表 | 无 | 无 |
| `#msgs` | 列出短期记录 | 无 | 无 |
| `#cmsgs` | 列出缓存记录 | 无 | 无 |
| `#sm` | 显示中期记忆概括 | 无 | 无 |
| `#pchat <true/false>` | 开启/关闭主动回复 | 开关 | 无 |
| `#model` | 查询可用模型 | 无 | 无 |
| `#ms <模型名>` | 设置文本模型 | 模型ID | 管理员 |
| `#skills` | 列出已安装技能 | 无 | 无 |
| `#reloadskls` | 重新加载技能 | 无 | 管理员 |

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

### 工具调用（Function Calling）

AI 在对话过程中可自主判断是否需要调用工具。调用流程：

```
AI 返回 tool_calls
    │
    ▼
chat.js 解析工具名和参数
    │
    ▼
tools.js 中的 callTool() 调度到对应函数
    │
    ▼
工具执行结果作为 tool 消息追加到对话列表
    │
    ▼
再次调用 LLM，直到不再返回 tool_calls（最多循环 10 次）
```

当前可用工具定义在 `llm/tools.js` 中：

| 工具名 | 功能 |
|--------|------|
| `get_memory` | 根据当前对话内容搜索长期记忆 |
| `get_user_profile` | 获取指定 QQ 号用户的画像信息（用户偏好、特征等） |
| `read_file` | 读取指定路径的文件（白名单限制：`skills/`、`workspace/`） |
| `run_JS` | 运行 JavaScript 脚本（白名单限制：`skills/`、`workspace/`），支持传递参数 |

扩展新工具只需：在 `tools` 数组中添加定义，在 `toolMap` 中注册实现函数。

### Skill 技能系统

项目支持通过 Skill 机制扩展 AI 能力。Skill 是包含 `SKILL.md` 描述文件的目录，可包含脚本供 AI 调用。

**目录结构：**
```
skills/
└── your-skill/
    ├── SKILL.md        # 技能元数据（name、description、命令说明）
    └── scripts/        # 技能脚本
        └── your-script.js
```

**SKILL.md 格式：**
```markdown
---
name: your-skill
description: 技能描述
---

# 技能名称

技能详细说明...

## 可用命令

### 1. 命令名称

filepath: scripts/your-script.js
args: { "param": "参数说明" }
```

**内置技能：skill-manager**

用于管理技能的安装和卸载：
- `install` — 从 GitHub 仓库安装技能
- `uninstall` — 卸载本地技能

**安全机制：**
- AI 只能读取和执行 `skills/` 和 `workspace/` 目录下的文件
- 脚本在子进程中执行，有 30 秒超时限制
- 参数通过 `process.argv[2]` 以 JSON 字符串形式传递

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
       ├─ pipeline/context.js ── config.js
       ├─ pipeline/middleware/
       │    ├─ image-recognizer.js ── services/napcat.js
       │    │                       ── utils/image-type.js
       │    │                       ── llm/image.js ── llm/client.js
       │    └─ mini-program.js ── llm/recorder.js ── llm/long-term-memory.js ── config.js
       └─ pipeline/handlers/
            ├─ keyword-commands.js ── services/acg.js
            │                      ── services/hitokoto.js
            │                      ── data/sunbatwo-girls.js
            │                      ── llm/recorder.js
            │                      ── utils/time.js
            ├─ user-commands.js ── services/weather.js
            │                    ── services/getModels.js
            │                    ── llm/skill.js
            ├─ ai-chat.js ── llm/chat.js ──┬── llm/client.js
            │             │               ├── llm/recorder.js
            │             │               ├── llm/tools.js ── llm/long-term-memory.js
            │             │               └── llm/skill.js
            │             ├── llm/recorder.js
            │             └── utils/time.js
            ├─ repeater.js ── tools/repeater.js ── utils/queue.js
            └─ proactive-chat.js ── llm/chat.js ──┬── llm/client.js
                                                  ├── llm/recorder.js
                                                  ├── llm/tools.js
                                                  ├── llm/skill.js
                                                  └── utils/time.js
```

---

## Skill 开发指南

### 创建新 Skill

1. 在 `src/skills/` 下创建目录，如 `my-skill/`
2. 创建 `SKILL.md` 描述文件，包含 frontmatter 元数据
3. 在 `scripts/` 子目录中编写 JS 脚本

### 脚本规范

- 脚本通过 `process.argv[2]` 接收 JSON 格式参数
- 结果通过 `console.log()` 输出
- 执行超时限制 30 秒
- 错误信息通过 `stderr` 或抛出异常传递

**示例脚本：**
```js
// skills/my-skill/scripts/hello.js
const args = JSON.parse(process.argv[2] || '{}');
const name = args.name || 'World';
console.log(`Hello, ${name}!`);
```

### 安装社区 Skill

AI 可通过内置的 `skill-manager` 技能从 GitHub 安装社区技能：

```
从 GitHub 仓库 owner/repo 安装技能
```

AI 会自动调用 `run_JS` 工具执行安装脚本。

---

## 开发建议

1. **添加新命令**：优先考虑放在 `pipeline/handlers/` 下的对应处理器中，或创建新的处理器文件并注册到 `pipeline/index.js`
2. **调用外部 API**：在 `services/` 下创建新文件，不要在 handler 中直接写 axios/fetch
3. **日志**：使用 `logger.info/warn/error` 替代 `console.log`
4. **配置**：新增配置项在 `config.js` 中添加，敏感信息放在 `configDev.js`