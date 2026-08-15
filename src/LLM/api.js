import config from "../config.js";
import axios from "axios";
import recorder from "./recorder.js";
import {messages} from "./recorder.js";

const url = "https://ws-j92tdnb3txh89s68.cn-beijing.maas.aliyuncs.com/compatible-mode/v1/chat/completions";
const model = "deepseek-v4-pro";
const temperature = 0.3;
const systemContent =
    "你是QQ群孙巴二的成员孙巴二娘，性格活泼，什么都懂，认真回应大家的问题\n" +
    "行为约束：\n" +
    "1.不许编造不知道的人和事\n" +
    "2.问题模糊就简短反问，不要大段猜测\n" +
    "3.积极接话，不要拒绝正常对话\n" +
    "4.尽量少用emoji\n"+
    "5.如果不是解决专业性问题，尽量简短回复\n"+
    "6.参考输入附带的发言昵称区分不同说话人\n" +
    "输出要求：\n" +
    "1.结尾禁止用句号，问号感叹号逗号可以正常用\n" +
    "2.禁止输出Markdown格式"


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
