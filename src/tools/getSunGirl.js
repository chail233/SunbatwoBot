import getIdx from "../common/getRandomNum.js";
let imgs = new Map();
imgs[0] = "https://img.tofaka.com/autoupload/f/8d522/20260817/myLT/2048X2048/0.png";
imgs[1] = "https://img.tofaka.com/autoupload/f/8d522/20260817/lLLd/2048X2048/1.png";
imgs[2] = "https://img.tofaka.com/autoupload/f/8d522/20260817/70dM/2048X2048/2.png";
imgs[3] = "https://img.tofaka.com/autoupload/f/8d522/20260817/goJB/2048X2048/3.png";
imgs[4] = "https://img.tofaka.com/autoupload/f/8d522/20260817/nAFc/2048X2048/4.png";
imgs[5] = "https://img.tofaka.com/autoupload/f/8d522/20260817/OEzX/2048X2048/5.png";
imgs[6] = "https://img.tofaka.com/autoupload/f/8d522/20260817/x67e/2048X2048/6.png";
imgs[7] = "https://img.tofaka.com/autoupload/f/8d522/20260817/6idA/2048X2048/7.png";
imgs[8] = "https://img.tofaka.com/autoupload/f/8d522/20260817/bt7E/2048X2048/8.png";
imgs[9] = "https://img.tofaka.com/autoupload/f/8d522/20260817/ae99/1061X1059/9.png";

const MAX = 9;
export default function (){
    const idx = getIdx(0, MAX);
    return imgs[idx];
}