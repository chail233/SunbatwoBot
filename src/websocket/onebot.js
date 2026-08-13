import {WebSocketServer} from 'ws';
import config from "../config.js";
import messageHandler from "../handlers/message.js";
let socket;
//创建 OneBot WebSocket 服务
export function startOneBotWS(){
    const wss = new WebSocketServer({port:config.wsPort, path:"/onebot/v11/ws"});

    wss.on("connection", ws => {
        console.log("Connected!");
        socket = ws;
        ws.on("message", async data=>{
            const event = JSON.parse(data);
            console.log("Received event:", event);
            await messageHandler(event);
        });
        console.log("ws listening on port: " + config.wsPort);
    });
}

export function getSocket() {
    return socket;
}