<!-- app-path probe: sunbatwo -->
<!-- test-marker: sunbatwo -->
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
- **MCP 工具扩展**（连接外部 MCP Server，动态加载远程工具，支持 stdio / SSE / Streamable HTTP 三种传输协议）

你可以快速地配置并使用该项目，或者扩展开发自己想要的功能。

## 快速开始

### 环境要求

- Node.js >= 24
- NapCat 客户端已运行并配置好反向 WebSocket 连接

### 安装与启动

```bash
# 拉取代码
git clone https://github.com/chail233/SunbatwoBot
# 安装依赖
npm install
# 启动
npm start
```

### 配置

所有配置集中在 `src/config.js` 中。

**开发环境：** 将 `config.js` 中的 `DevMode` 设为 `true`，在 `src/configDev.js` 中填写真实配置（Token、API Key 等）。

**生产环境：** 将 `DevMode` 设为 `false`，直接在 `config.js` 中填写配置值。

主要配置项：
- `token`: OneBot 鉴权 Token
- `wsHost`: WebSocket 监听地址，默认 `127.0.0.1`；仅在需要远程连接时显式改为可达接口地址
- `targetGroupId`: 目标群 ID
- `selfId`: 机器人 QQ 号
- `aiAPIKEY`: 阿里云 AI API Key
- `qweatherKEY`: 和风天气 Key
- `githubToken`: GitHub Token（可选，用于技能管理）
- `members`: QQ 号 → 群昵称映射表
- `EnableProactiveChat`: 是否启用主动聊天
- `mcpServers`: MCP Server配置列表

NapCat 反向 WebSocket 连接地址：`ws://127.0.0.1:8080/onebot/v11/ws`

入向连接必须在 `Authorization: Bearer <token>` 或 `access_token` 查询参数中提供与 `token` 配置一致的凭证。远程监听时请显式配置 `wsHost`，并继续使用非占位 Token。`ws://` 不加密；跨不可信网络连接时请使用 VPN 或 TLS 反向代理。

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
│   ├── tools.js                # 工具定义与调度（Function Calling + MCP 路由）
│   ├── mcp-client.js           # MCP 客户端管理器（连接外部 Server，加载远程工具）
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
│   └── repeater.js             # 复读检测算法
│
├── skills/                     # Skill 技能目录（AI 可读写）
│   ├── skill-manager/          # 内置技能：技能管理器
│
├── workspace/                  # 工作区目录（AI 可读写）
│
└── utils/                      # 通用工具
    ├── logger.js               # 统一日志（带时间戳）
    ├── sleep.js                # 延迟
    ├── random.js               # 随机整数
    ├── queue.js                # 队列数据结构
    ├── time.js                 # 时间处理
    ├── image-type.js           # 图片格式检测（文件头魔数）
    └── file-security.js        # 文件路径安全校验
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

### 工具调用（Function Calling）

AI可自主调用工具：
- `get_memory`：搜索长期记忆
- `get_user_profile`：获取用户画像
- `read_file`、`run_JS`、`create_file`、`delete_file`、`edit_file`、`list_files`：文件操作（白名单限制）
- `list_mcp_tools`：动态加载指定MCP Server的工具到工具列表

### MCP 工具扩展

支持连接外部MCP Server，三种传输协议：
- `stdio`：本地子进程
- `old_sse`：旧版SSE
- `sse`：新版Streamable HTTP

配置示例见 `configDev.js` 中的 `mcpServers` 字段。MCP工具通过 `list_mcp_tools` 工具动态加载到AI的工具列表中。

### Skill 技能系统

Skill是包含 `SKILL.md` 的目录，可包含脚本供AI调用。

**内置技能：**
- `skill-manager`：从GitHub安装/卸载社区技能

**安全机制**：AI只能访问 `skills/` 和 `workspace/` 目录，脚本在子进程中执行（30秒超时）。

## 开发指南

### 添加关键词命令

在 `pipeline/handlers/keyword-commands.js` 的 `CMD_MAP` 中添加：

```js
CMD_MAP.set("关键词", async (ctx) => {
    ctx.adapter.sendGroupMsg(ctx.event.group_id, "回复内容");
});
```

### 添加用户命令（# 前缀）

在 `pipeline/handlers/user-commands.js` 的 `cmds` 数组中添加：

```js
{
    name: "命令名",
    description: "命令描述",
    params: [{ name: "参数名", desc: "参数说明" }],
    handler: async (args, ctx) => {
        return "回复文本";
    }
}
```

### 添加新中间件

在 `pipeline/middleware/` 下创建文件，导出函数接收 `ctx` 参数，在 `pipeline/index.js` 的 `middlewares` 数组中注册。

### 添加新服务

在 `services/` 下创建文件，封装外部API调用，使用 `logger` 记录日志。

### Skill 开发

1. 在 `src/skills/` 下创建目录
2. 创建 `SKILL.md`（包含frontmatter元数据：name、description）
3. 在 `scripts/` 子目录中编写JS脚本

脚本通过 `process.argv[2]` 接收JSON参数，通过 `console.log()` 输出结果。

### 开发建议

- 新增命令放在 `pipeline/handlers/` 下
- 外部API调用封装在 `services/` 下
- 使用 `logger.info/warn/error` 记录日志
- 配置项在 `config.js` 中添加，敏感信息放 `configDev.js`
