import getIdx from "../common/getRandomNum.js";

const imgPath = "D:/Document/WebDev/SunbatwoBot/assets/SunbatwoGirl/";
const MAX = 9;
export default function (){
    return imgPath + getIdx(0, MAX) + ".png";
}