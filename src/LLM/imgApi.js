import config from "../config.js";
import axios from "axios";
const url = "https://ws-j92tdnb3txh89s68.cn-beijing.maas.aliyuncs.com/compatible-mode/v1/chat/completions";
export const model = "qwen3.7-plus";
export default async function call(base64, type){
    let desc;
    if(type === "jpg") desc = "image/jpeg";
    else if(type === "png") desc = "image/png";
    else if(type === "webp") desc = "image/webp";
    else return null;
    let data = {
        model: model,
        messages: [
            {"role": "user",
                "content": [{"type": "image_url",
                    // 需要注意，传入Base64，图像格式（即image/{format}）需要与支持的图片列表中的Content Type保持一致。
                    // PNG图像：  data:image/png;base64,${base64Image}
                    // JPEG图像： data:image/jpeg;base64,${base64Image}
                    // WEBP图像： data:image/webp;base64,${base64Image}
                    "image_url": {"url": `data:${desc};base64,${base64}`},},
                    {"type": "text", "text": "请准确描述这张图片的内容，回答长度适中，只输出描述，不要带有其它格式的内容。"}
                ]
            }
        ],
    }
    try {
        const res = await axios(url, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${config.aiAPIKEY}`,
                "Content-Type": "application/json"
            },
            data: data,
            timeout: 30000
        });
        const body = res.data;
        if (!body?.choices?.[0]?.message?.content) {
            return "ERROR:返回格式异常";
        }
        console.log(body);
        // console.log(JSON.stringify(body.choices[0].message, null, 2));
        const reply=body.choices[0].message.content;
        console.log("本次识图消耗："+body.usage.total_tokens);
        return reply;
    }
    catch(err){
        console.error("识图api错误："+err.toString());
        return null;
    }
}