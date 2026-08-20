import queue from "../utils/queue.js";

const blackname = new Set();
const messageQueue = new queue();
let l1="null";
let l2="null";
export default function received(message) {
    if(messageQueue.size()>=10){
        const msg = messageQueue.pop();
        if(blackname.has(msg)){
            blackname.delete(msg);
        }
    }
    messageQueue.push(message);
    let f = false;
    l2 = l1;
    l1 = message;
    if(!blackname.has(message) && l1===l2 && l1===message){
        blackname.add(message);
        f = true;
    }
    return f;
}