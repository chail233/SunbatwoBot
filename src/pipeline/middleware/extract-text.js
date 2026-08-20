// @ts-check

/**
 * 提取纯文本中间件
 * 确保 context.text 存在
 * @param {object} ctx
 */
export default function extractText(ctx) {
    // text 已在 buildContext 中提取
    // 这里仅做日志
    if (ctx.text) {
        // console.log("收到的群消息内容:", ctx.text);
    }
}