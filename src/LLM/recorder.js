const LIMIT = 50;

let messages = [];
export default function addUserMsg(msg){
    while (messages.length>LIMIT) messages.shift();
    messages.push(msg);
}