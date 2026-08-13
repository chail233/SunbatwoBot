import {sendGroupMsg} from "../websocket/act.js";
import config from "../config.js";
import needRepeat from "./repeater.js";
import getSentence from "./sentence.js";
const sentence_command = "来句台词";
const sentence_fail = "急什么，慢点发";

export default async function(event, socket) {
    if(event.post_type!=="message"){return;}
    if(event.message_type==="group" && event.group_id==config.targetGroupId){
        let text = extractText(event.message);
        console.log("received group message:", text);

        if(text.toString()===sentence_command){
            const sentence = await getSentence();
            if(sentence) sendGroupMsg(socket, event.group_id, sentence);
            else sendGroupMsg(socket, event.group_id, sentence_fail);
        }

        if(text.toString()!== sentence_command && needRepeat(text)){
            sendGroupMsg(socket, event.group_id, text);
        }
    }
}
function extractText(message){
    return message.filter(x=>x.type==="text").map(x=>x.data.text).join("");
}