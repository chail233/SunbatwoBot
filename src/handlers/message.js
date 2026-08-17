import {sendGroupMsg} from "../websocket/act.js";
import config from "../config.js";
import needRepeat from "../tools/repeater.js";
import getSentence from "../tools/sentence.js";
import getAcg from "../tools/acg.js";
import runCode from "../tools/runcode.js";
import chatAPI from "../LLM/api.js";
import recorder from "../LLM/recorder.js";
import {members} from "../tools/members.js";
import getSunGirl from "../tools/getSunGirl.js";
import sleep from "../common/sleep.js";
const cmd = new Map();
const selfId = "1678766631";
let msgWithoutChat = 0;
const chatLIMIT = 10;
cmd.set("来句台词", async (event, socket)=>{
    const sentence = await getSentence();
    if(sentence) sendGroupMsg(socket, event.group_id, sentence);
    else sendGroupMsg(socket, event.group_id, "别急");
});
cmd.set("来张图", async (event, socket)=>{
    const img = await getAcg();
    sendGroupMsg(socket, event.group_id, img);
});
cmd.set("来只孙巴二娘", async (event, socket)=>{
    sendGroupMsg(socket, event.group_id, [{type:"image",data:{file:getSunGirl()}}]);
});
cmd.set("来只牛魔", async (event, socket)=>{
    sendGroupMsg(socket, event.group_id, [{type:"image", data:{file:"https://img.tofaka.com/autoupload/f/8d522/20260817/myLT/2048X2048/0.png"}}])
})

export default async function(event, socket) {
    if(event.post_type!=="message"){return;}

    const getName = (event)=>{
        const userID = event.user_id.toString();
        if(members.has(userID)) return members.get(userID);
        else return event.sender.nickname;
    };

    if(event.message_type==="group" && event.group_id.toString()===config.targetGroupId){
        let text = extractText(event.message);
        if(!text) {
            for(let seg of event.message){
                if(seg.type==="json" && JSON.parse(seg.data?.data)?.meta?.detail_1?.title==="QQ经典农场"){
                    sendGroupMsg(socket, event.group_id, "又在玩你那个破农场");
                }
                if(seg.type==="json" && JSON.parse(seg.data?.data)?.meta?.detail_1?.title==="哔哩哔哩"){
                    sendGroupMsg(socket, event.group_id, "又在搬史是吧");
                }
            }
            return;
        }
        console.log("received group message:", text);

        //判断消息类型
        for(let seg of event.message){
            if(seg.type==="at" && seg.data.qq===selfId){
                //模型对话
                const msg = {
                    "role":"user",
                    "content":getName(event)+"对你说:"+text
                }
                const res = await chatAPI(msg);
                aiReply(socket, event.group_id, res);
                msgWithoutChat = 0;
                return;
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
            return;
        }

        //比对文本
        if(cmd.has(text.toString())) {
            await cmd.get(text.toString())(event, socket);
            return;
        }

        //复读
        if(!cmd.has(text.toString()) && needRepeat(text)){
            sendGroupMsg(socket, event.group_id, text);
        }


        //触发主动对话
        if(msgWithoutChat >= chatLIMIT){
            msgWithoutChat=0;
            const res = await chatAPI({
                "role": "user",
                "content":getName(event)+":"+text
            });
            aiReply(socket, event.group_id, res);
        }
        else {
            //记录上下文
            recorder({
                "role": "user",
                "content":getName(event)+":"+text
            });
            msgWithoutChat++;
        }
    }
}
function extractText(message){
    return message.filter(x=>x.type==="text").map(x=>x.data.text).join("");
}


async function aiReply(socket, group_id, res){
    let tk = false;
    for (const act of res.acts) {
        if(act.cmd==="text"){
            if(!tk) {
                tk = true;
                act.content += `(${res.tokens}tokens)`;
            }
            sendGroupMsg(socket, group_id, act.content);
        }
        await sleep(1200+Math.floor(Math.random()*1000));
    }
}