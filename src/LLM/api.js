import config from "../config.js";
import axios from "axios";
import recorder from "./recorder.js";
import {messages} from "./recorder.js";
import * as tty from "node:tty";

const url = "https://ws-j92tdnb3txh89s68.cn-beijing.maas.aliyuncs.com/compatible-mode/v1/chat/completions";
export let model = "deepseek-v4-flash";
const temperature = 0.2;
const systemContent =
    "你是QQ群孙巴二的成员孙巴二娘，性格活泼，什么都懂，认真回应大家的问题\n" +
    "行为约束：\n" +
    "1.不许编造不知道的人和事\n" +
    "2.问题模糊就简短反问，不要大段猜测\n" +
    "3.积极接话，不要拒绝正常对话\n" +
    "4.尽量少用emoji\n"+
    "5.如果不是解决专业性问题，尽量简短回复\n"+
    "6.参考输入附带的发言昵称区分不同说话人\n" +
    "7.如果回复需要联网搜索，使用联网搜索获取信息\n" +
    "输出要求：\n" +
    "你可以根据情境决定消息一次发送还是分成多条发送以模仿网上聊天的效果，但必须以JSON格式输出，示例如下：\n" +
    "{\n" +
    "    \"action\":[\n" +
    "        {\"cmd\":\"text\",\"content\":\"消息1内容\"},\n" +
    "        {\"cmd\":\"text\",\"content\":\"消息2内容\"}\n" +
    "    ]\n" +
    "}\n"+
    "action字段的值是一个数组，数组中每个对象有cmd和content两个字段，cmd代表消息类型，必须为text，content代表消息内容，由你决定。\n" +
    "数组中的消息将按顺序发送，每条消息内容最后不许加句号。\n"+
    "只输出JSON，不要任何额外解释、markdown代码块。"


export default async function call(curMsg){
    recorder(curMsg);
    let data = {
        model: model,
        messages:[
            {
                "role": "system",
                "content": systemContent,
            },
        ],
        enable_search: true,
        temperature:temperature,
        response_format: {
            type: "json_object"
        }
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
            timeout: 30000
        });
        const body = res.data;
        if (!body?.choices?.[0]?.message?.content) {
            return "ERROR:返回格式异常";
        }
        console.log(body);
        // console.log(JSON.stringify(body.choices[0].message, null, 2));
        let reply;
        try{
            reply = JSON.parse(body.choices[0].message.content);
        }
        catch(err){
            return err.toString();//json解析错误
        }
        let replyContent = "";
        reply.action.forEach(e => {
            replyContent += `${e.content}\n`;
        });
        recorder({
            "role": "assistant",
            "content":replyContent
        });
        return {acts:reply.action, tokens:body.usage.total_tokens}
    }
    catch(err){
        if(err.response?.data){
            console.error(err.response.data.toString());
        }
        if(err.response?.data?.error?.message){
            return err.response.data.error.message.toString();
        }
        else return err.toString();
    }
}
