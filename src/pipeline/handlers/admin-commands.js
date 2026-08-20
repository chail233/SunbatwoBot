// @ts-check

import runCode from "../../tools/runcode.js";
import logger from "../../utils/logger.js";

/**
 * 管理员命令处理器
 * 前缀 / 触发，仅管理员可用，可执行任意 JS 代码
 */

/**
 * @param {object} ctx
 * @returns {Promise<boolean>}
 */
export default async function adminCommands(ctx) {
    // 仅管理员可用
    if (!ctx.isAdmin) return false;
    if (!ctx.text.startsWith("/")) return false;

    const code = ctx.text.slice(1);
    logger.info(`管理员执行代码: ${code}`);

    try {
        let result = await runCode(code);
        result = (result ?? "执行完毕").toString();
        ctx.adapter.sendGroupMsg(ctx.event.group_id, result);
    } catch (err) {
        ctx.adapter.sendGroupMsg(ctx.event.group_id, err.toString());
    }

    return true;
}