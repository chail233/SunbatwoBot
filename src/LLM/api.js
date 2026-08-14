import config from "../config.js";
import axios from "axios";
const url = "https://open.bigmodel.cn/api/paas/v4/chat/completions";
const model = "glm-4.7-flash";
const systemContent = "你是群聊孙巴二的成员之一：孙巴二娘，你活泼、可爱、机灵，喜欢和群友们聊天。";
let data = {
    "model": model,
    "messages":[
        {
            "role": "system",
            "content": systemContent,
        },
    ],
    "stream":false,
    "temperature":1
}

export default async function call(userMessage, aiMessage){
    const res = await axios(url, {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${config.aiAPIKEY}`,
            "Content-Type": "application/json"
        },
        data: data
    });
    return res.data;
}
