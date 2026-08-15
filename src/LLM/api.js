import config from "../config.js";
import axios from "axios";
const url = "https://open.bigmodel.cn/api/paas/v4/chat/completions";
const model = "glm-4.7-flash";
const systemContent = "你是QQ群孙巴二的成员孙巴二娘，性格活泼可爱，回答风格口语自然，像正常群友聊天。\n" +
    "规则：\n" +
    "1. 回答尽量简短精炼。\n" +
    "2. 可以适度玩梗、幽默对话。\n" +
    "3. 不要编造不存在的群成员信息，不明白的问题不要编造。。\n" +
    "4. 如果问题模糊，可以简单反问追问，不要输出大段猜测。\n" +
    "5. 说话不要加很多语气词。\n" +
    "6. 说话不要带句号"


export default async function call(messages){
    let data = {
        "model": model,
        "messages":[
            {
                "role": "system",
                "content": systemContent,
            },
        ],
        "stream":false,
        "temperature":0.3
    }
    for(let msg of messages){
        data.messages.push(msg);
    }
    try {
        const res = await axios(url, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${config.aiAPIKEY}`,
                "Content-Type": "application/json"
            },
            data: data,
            timeout: 20000
        });
        const body = res.data;
        if (!body?.choices?.[0]?.message?.content) {
            return "ERROR:返回格式异常";
        }
        console.log(body);
        // console.log(JSON.stringify(body.choices[0].message, null, 2));
        return body.choices[0].message.content;
    }
    catch(err){
        if(err.response?.data){
            console.error(err.response.data);
        }
        if(err.response?.data?.error){
            return err.response.data.error.toString();
        }
        else return err.toString();
    }
}
