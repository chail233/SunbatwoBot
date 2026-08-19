import {WebSocketServer} from 'ws';
import config from "../config.js";
import messageHandler from "../handlers/message.js";
import {init} from "../handlers/message.js";
let socket=null;
//创建 OneBot WebSocket 服务
export async function startOneBotWS(){
    const wss = new WebSocketServer({port:Number(config.wsPort), path:"/onebot/v11/ws"});
    wss.on("connection", ws => {
        console.log("Connected!");
        socket = ws;
        init(socket);
        ws.on("message", async data=>{
            const event = JSON.parse(data);
            console.log("Received event:", event);
            await messageHandler(event, socket);
        });
        console.log("ws listening on port: " + config.wsPort);
    });
}

