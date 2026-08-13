import {sendGroupMsg} from "../websocket/act.js";
import config from "../config.js";

export default async function(event){
    if(event.post_type!=="message"){return;}
    if(event.message_type==="group" && event.group_id===config.targetGroupId){
        let text = extractText(event.message);
        console.log("received group message:", text);
        await  sendGroupMsg(event.group_id, text);
    }
}
function extractText(message){
    return message.filter(x=>x.type==="text").map(x=>x.data.text).join("");
}