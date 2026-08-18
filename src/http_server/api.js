import axios from "axios";
import config from "../config.js";
async function callAPI(action, params){
    const url = `http://${config.httpIP}/${action}`;
    const result = await axios.post(url, params, {
        headers:{Authorization:`Bearer ${config.token}`}
    });
    return result.data;
}

export async function sendGroupMsg(groupId, message){
    return callAPI("send_group_msg", {group_id: groupId, message});
}

export async function getImage(fileId){
    return await callAPI("get_image", {file: fileId});
}