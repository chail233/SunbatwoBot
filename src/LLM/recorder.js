const LIMIT = 50;

export let messages = [];
export default function addUserMsg(msg){
    while (messages.length>LIMIT) messages.shift();
    messages.push(msg);
    // console.log("记录"+JSON.stringify(msg, null, 2));
}