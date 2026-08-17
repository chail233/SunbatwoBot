import getIdx from "../common/getRandomNum.js";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const imgPath = join(__dirname, "../../assets/SunbatwoGirl");
const MAX = 9;
export default function (){
    const idx = getIdx(0, MAX);
    const realPath = join(imgPath, `${idx}.png`);
    return `file:///${realPath}`;
}