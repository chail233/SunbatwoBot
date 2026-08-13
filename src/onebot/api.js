import axios from "axios";
import config from "../config.js";
async function callAPI(action, params){
    const url = `${config.napcatApi}/${action}`;
    const result = await axios.post(url, params, {
        headers:{Authorization:`Bearer ${config.token}`}
    });
    return result.data;
}

export async function sendGroupMsg(groupId, message){
    return callAPI("send_group_msg", {group_id: groupId, message});
}