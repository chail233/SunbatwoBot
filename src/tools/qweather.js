import axios from "axios";
import config from "../config.js";
const KEY = config.qweatherKEY;
const BASE_URL = "https://m454e6xkq4.re.qweatherapi.com/v7";
const GEO_BASE = "https://m454e6xkq4.re.qweatherapi.com/geo/v2";

// 创建axios实例，统一设置超时，避免半截响应报错
const api = axios.create({
    timeout: 8000,
});

/**
 * 获取城市locationId
 * @param {string} cityName 城市名，例如 杭州、北京
 * @returns {Promise<string|null>} locationId
 */
export async function getLocationId(cityName) {
    try {
        const params = {
            location: cityName,
            key: KEY,
        };
        // console.log("请求参数",params);
        const resp = await api.get(`${GEO_BASE}/city/lookup`, { params });
        // console.log("geo status:",resp.status,"data:",resp.data);
        const json = resp.data;
        if (json.code !== "200") return null;
        return json.location[0].id;
    } catch (e) {
        console.error("获取城市id失败 status=",e.response?.status , "data=",e.response?.data);
        return null;
    }
}

/**
 * 获取实时天气
 * @param {string} locationId
 */
export async function getNowWeather(locationId) {
    try {
        const params = {
            location: locationId,
            key: KEY,
        };
        const resp = await api.get(`${BASE_URL}/weather/now`, { params });
        const json = resp.data;
        if (json.code !== "200") return null;
        return json.now;
    } catch (e) {
        console.error("获取实时天气失败", e.message);
        return null;
    }
}

/**
 * 获取7天预报
 * @param {string} locationId
 */
export async function get7dWeather(locationId) {
    try {
        const params = {
            location: locationId,
            key: KEY,
        };
        const resp = await api.get(`${BASE_URL}/weather/7d`, { params });
        const json = resp.data;
        if (json.code !== "200") return null;
        return json.daily;
    } catch (e) {
        console.error("获取7天预报失败", e.message);
        return null;
    }
}

// 一键对外：输入城市名，返回 {now, daily7d}
export async function getWeatherByCity(cityName) {
    const lid = await getLocationId(cityName);
    if (!lid) return { error: "找不到该城市" };
    const now = await getNowWeather(lid);
    const daily7d = await get7dWeather(lid);
    if (!now || !daily7d) return { error: "天气接口请求异常" };
    return { now, daily7d };
}




/**
 * 格式化和风天气返回结果为QQ聊天文本
 * @param {Object} weatherRes getWeatherByCity 返回结果 {now, daily7d,error?}
 * @param {string} cityName 城市名
 * @returns {string}
 */
export function formatWeatherText(weatherRes, cityName) {
    if (weatherRes.error) {
        return weatherRes.error;
    }
    const { now, daily7d } = weatherRes;

    const nowStr = `🌤 ${cityName} 实时天气
${now.text}｜${now.temp}℃
体感：${now.feelsLike}℃
风向：${now.windDir} ${now.windScale}级
湿度：${now.humidity}%`;

    // 今日
    const today = daily7d[0];
    const todayStr = `
📅今日(${today.fxDate})
白天：${today.textDay}  ${today.tempMin}~${today.tempMax}℃
夜间：${today.textNight}
紫外线：${today.uvIndex}`;

    // 未来两天
    const day1 = daily7d[1];
    const day2 = daily7d[2];
    const futureStr = `
📆${day1.fxDate}：${day1.textDay} ${day1.tempMin}~${day1.tempMax}℃
📆${day2.fxDate}：${day2.textDay} ${day2.tempMin}~${day2.tempMax}℃`;

    return nowStr + todayStr + futureStr;
}

export async function getWeatherText(city){
    let weather = await getWeatherByCity(city);
    weather = formatWeatherText(weather, city);
    return weather;
}