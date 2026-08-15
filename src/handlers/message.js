import {sendGroupMsg} from "../websocket/act.js";
import config from "../config.js";
import needRepeat from "./repeater.js";
import getSentence from "./sentence.js";
import getAcg from "./acg.js";
import runCode from "./runcode.js";
import chatAPI from "../LLM/api.js";
const cmd = new Map();
const selfId = "1678766631";

cmd.set("来句台词", async (event, socket)=>{
    const sentence = await getSentence();
    if(sentence) sendGroupMsg(socket, event.group_id, sentence);
    else sendGroupMsg(socket, event.group_id, "别急");
});
cmd.set("来张图", async (event, socket)=>{
    const img = await getAcg();
    sendGroupMsg(socket, event.group_id, img);
});

export default async function(event, socket) {
    if(event.post_type!=="message"){return;}

    if(event.message_type==="group" && event.group_id.toString()===config.targetGroupId){
        let text = extractText(event.message);
        if(!text) return;
        console.log("received group message:", text);

        //模型对话
        for(let seg of event.message){
            if(seg.type==="at" && seg.data.qq===selfId){
                const msg = [
                    {
                    "role":"user",
                    "content":text
                    },
                ]
                const res = await chatAPI(msg);
                sendGroupMsg(socket, event.group_id, res);
            }
        }

        //判断指令
        if(text.length!==0 && text[0]==='/' && event.user_id.toString()===config.owner){
            text = text.slice(1);
            let res = await runCode(text);
            try{
                res = res.toString();
                sendGroupMsg(socket, event.group_id, res);
            }
            catch(err){
                sendGroupMsg(socket, event.group_id, err.toString());
            }
        }

        //比对文本
        if(cmd.has(text.toString())) await cmd.get(text.toString())(event, socket);

        //复读
        if(!cmd.has(text.toString()) && needRepeat(text)){
            sendGroupMsg(socket, event.group_id, text);
        }
    }
}
function extractText(message){
    return message.filter(x=>x.type==="text").map(x=>x.data.text).join("");
}