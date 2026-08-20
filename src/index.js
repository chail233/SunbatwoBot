// @ts-check

import logger from "./utils/logger.js";
import { startOneBotServer } from "./bot/server.js";
import runPipeline from "./pipeline/index.js";

logger.info("SunbatwoBot 启动中...");

// 启动 WebSocket 服务，使用管道模式处理事件
startOneBotServer(runPipeline);