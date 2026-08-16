const api = [
    "https://v1.hitokoto.cn/?min_length=20?max_length=100",
];
const LIMIT_COUNT = 3;
const LIMIT_TIME = 10*1000;
let count = 0;
let lastTime = Date.now();
export default async function() {
    const nowTime = Date.now();
    if(nowTime - lastTime > LIMIT_TIME) {
        lastTime = nowTime;
        count = 0;
    }
    if(count >= LIMIT_COUNT) return null;
    const res = await fetch(api);
    const data = await res.json();
    let str = data.hitokoto;
    if (str.endsWith("。") || str.endsWith(".")) {
        str = str.slice(0, -1);
    }
    return str;
}