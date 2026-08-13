import {getSocket} from "./onebot.js";
const socket = getSocket();

function act(action, params, echo){
    const data = {"action": action, "params": params, "echo": echo};
    socket.send(JSON.stringify(data));
}

export function sendGroupMsg(groupId, message, echo='0'){
    const action = "send_group_msg";
    const params = {
        "group_id": groupId,
        "message": message
    }
    act(action, params, echo);
}