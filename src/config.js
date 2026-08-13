import dotenv from "dotenv";
dotenv.config();
export default {
    wsPort:Number(process.env.WS_PORT),
    napcatApi:process.env.NAPCAT_API,
    token:process.env.ONEBOT_TOKEN,
    targetGroupId:process.env.TARGET_GROUP_ID
};