// @ts-check

import axios from "axios";
import config from "../config/index.js";
import logger from "../utils/logger.js";
import { LLM_API_URL, LLM_TIMEOUT } from "../consts.js";

/**
 * 模型列表查询
 * 调用 GET /api/v1/models，筛选支持
 * 联网搜索(web-search)与结构化输出(structured-outputs)、
 * 且最近半年内发布的模型。
 */

const api = axios.create({
    baseURL: LLM_API_URL,
    timeout: LLM_TIMEOUT,
    headers: {
        Authorization: `Bearer ${config.aiAPIKEY}`,
        "Content-Type": "application/json",
    },
    // 数组参数按重复键名序列化：features=a&features=b
    paramsSerializer: { indexes: null },
});

/** 需要同时具备的模型能力 */
const REQUIRED_FEATURES = ["web-search", "structured-outputs"];

/** 只保留最近 N 个月内发布的模型 */
const RECENT_MONTHS = 6;

/** 单页拉取数量 */
const PAGE_SIZE = 100;

/**
 * 判断模型是否在最近 RECENT_MONTHS 个月内发布
 * @param {object} model
 * @param {number} cutoff 截止时间戳（毫秒）
 * @returns {boolean}
 */
function isRecentlyPublished(model, cutoff) {
    if (!model.published_time) return false;
    // published_time 形如 "2025-11-11 12:00:00"，按本地时间解析
    const t = new Date(model.published_time.replace(" ", "T")).getTime();
    return Number.isFinite(t) && t >= cutoff;
}

/**
 * 拉取符合条件的模型（原始对象数组）
 * @returns {Promise<Array<object>>}
 */
export async function fetchModels() {
    /** @type {Array<object>} */
    const models = [];
    let pageNo = 1;

    // 最近半年的截止时间
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - RECENT_MONTHS);
    const cutoffTime = cutoff.getTime();

    while (true) {
        const resp = await api.get("/api/v1/models", {
            params: {
                features: REQUIRED_FEATURES,
                page_no: pageNo,
                page_size: PAGE_SIZE,
            },
        });
        const output = resp.data?.output;
        if (!output) break;

        const list = Array.isArray(output.models) ? output.models : [];
        for (const m of list) {
            const feats = Array.isArray(m.features) ? m.features : [];
            if (
                REQUIRED_FEATURES.every((f) => feats.includes(f)) &&
                isRecentlyPublished(m, cutoffTime)
            ) {
                models.push(m);
            }
        }

        const total = Number(output.total) || 0;
        if (list.length === 0 || pageNo * PAGE_SIZE >= total) break;
        pageNo++;
    }
    return models;
}

/**
 * 格式化单个模型的价格信息（只保留关键的默认计费区间）
 * @param {object} model
 * @returns {string}
 */
function formatPrice(model) {
    const groups = Array.isArray(model.prices) ? model.prices : [];
    if (!groups.length) return "无价格信息";

    // 只取默认（或首个）计费区间，避免分段价格过长
    const group =
        groups.find((g) => !g.range_name || g.range_name === "Default") || groups[0];
    const items = Array.isArray(group.prices) ? group.prices : [];

    const seg = items.map((p) => {
        const unit = String(p.price_unit || "").replace(/^每/, "");
        return `${p.price_name || p.type}${p.price}元/${unit}`;
    });

    return seg.length ? seg.join("，") : "无价格信息";
}

/**
 * 获取模型列表文本
 * @returns {Promise<string>}
 */
export async function getModelsText() {
    let models;
    try {
        models = await fetchModels();
    } catch (err) {
        logger.error("查询模型列表失败:", err.response?.data || err.message);
        return "查询模型列表失败，请稍后再试";
    }

    if (!models.length) {
        return `没有找到最近${RECENT_MONTHS}个月内发布、且同时支持联网搜索和结构化输出的模型`;
    }

    const lines = models.map(
        (m) => `${m.model}（${m.name}）\n  ${formatPrice(m)}`,
    );
    return (
        `最近${RECENT_MONTHS}个月内发布的模型共 ${models.length} 个：\n` +
        lines.join("\n")
    );
}
