// @ts-check

import axios from "axios";
import config from "../config/index.js";
import logger from "../utils/logger.js";
import { LLM_API_URL, LLM_TIMEOUT } from "../consts.js";

/**
 * 模型列表查询
 * 调用 GET /api/v1/models，筛选支持
 * 联网搜索(web-search)与结构化输出(structured-outputs)的模型。
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

/** 单页拉取数量 */
const PAGE_SIZE = 100;

/**
 * 拉取符合条件的模型（原始对象数组）
 * @returns {Promise<Array<object>>}
 */
export async function fetchModels() {
    /** @type {Array<object>} */
    const models = [];
    let pageNo = 1;

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
            if (REQUIRED_FEATURES.every((f) => feats.includes(f))) {
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
 * 格式化单个模型的价格信息
 * @param {object} model
 * @returns {string}
 */
function formatPrice(model) {
    const groups = Array.isArray(model.prices) ? model.prices : [];
    /** @type {string[]} */
    const parts = [];

    for (const group of groups) {
        const items = Array.isArray(group.prices) ? group.prices : [];
        const seg = items.map(
            (p) => `${p.price_name || p.type}：${p.price} 元（${p.price_unit}）`,
        );
        if (!seg.length) continue;
        if (group.range_name && group.range_name !== "Default") {
            parts.push(`[${group.range_name}] ${seg.join("，")}`);
        } else {
            parts.push(seg.join("，"));
        }
    }

    return parts.length ? parts.join("；") : "无价格信息";
}

/**
 * 获取「百炼平台支持联网搜索+结构化输出」的模型列表文本
 * @returns {Promise<string>}
 */
export async function getBailianModelsText() {
    let models;
    try {
        models = await fetchModels();
    } catch (err) {
        logger.error("查询百炼模型列表失败:", err.response?.data || err.message);
        return "查询模型列表失败，请稍后再试";
    }

    if (!models.length) {
        return "没有找到同时支持联网搜索和结构化输出的百炼模型";
    }

    const lines = models.map(
        (m) => `${m.model}（${m.name}）\n  ${formatPrice(m)}`,
    );
    return (
        `百炼平台支持「联网搜索+结构化输出」的模型共 ${models.length} 个：\n` +
        lines.join("\n")
    );
}
