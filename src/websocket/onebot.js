import {WebSocketServer} from 'ws';
import config from "../config.js";
import messageHandler from "../handlers/message.js";
let socket;

export function startOneBotWS(){
    const wss = new WebSocketServer({port:config.wsPort, path:"/onebot/v11/ws"});
}