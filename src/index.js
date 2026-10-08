// @ts-check

import logger from "./utils/logger.js";
import { startOneBotServer } from "./bot/server.js";
import runPipeline from "./pipeline/index.js";
import {mcpClient} from "./llm/mcp-client.js";

logger.info("SunbatwoBot 启动中...");

await mcpClient.init();

// 启动 WebSocket 服务，使用管道模式处理事件
startOneBotServer(runPipeline);