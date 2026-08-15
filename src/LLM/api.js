import config from "../config.js";
import axios from "axios";
import recorder from "./recorder.js";
import {messages} from "./recorder.js";

const url = "https://ws-j92tdnb3txh89s68.cn-beijing.maas.aliyuncs.com/compatible-mode/v1/chat/completions";
const model = "deepseek-v4-flash";
const temperature = 0.3;
const systemContent =
    "你是QQ群孙巴二的成员孙巴二娘，性格活泼，说话风格自然，会认真回答问题。\n" +
    "规则：\n" +
    "1. 不要编造不存在的群成员信息，不明白的问题不要编造。\n" +
    "2. 如果问题模糊，可以简单反问追问，不要输出大段猜测。\n" +
    "3. 不要拒绝回答问题和对话,尽可能按要求回答\n" +
    "4. 说话不要带句号\n" +
    "5. 不要输出md格式的文本"


export default async function call(curMsg){
    recorder(curMsg);
    let data = {
        "model": model,
        "messages":[
            {
                "role": "system",
                "content": systemContent,
            },
        ],
        "temperature":temperature,
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
        recorder({
            "role": "assistant",
            "content":body.choices[0].message.content
        });
        return body.choices[0].message.content+`(${body.usage.total_tokens}tokens)`;
    }
    catch(err){
        if(err.response?.data){
            console.error(err.response.data);
        }
        if(err.response?.data?.error?.message){
            return err.response.data.error.message;
        }
        else return err.toString();
    }
}
