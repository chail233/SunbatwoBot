import fs from 'fs';

// 返回: jpg / png / gif / webp / null
export default function getImageType(filePath) {
    const fd = fs.openSync(filePath, 'r');
    const buf = Buffer.alloc(12);
    fs.readSync(fd, buf, 0, 12, 0);
    fs.closeSync(fd);

    if(buf[0] === 0xFF && buf[1] === 0xD8 && buf[2] === 0xFF) return "jpg";
    if(buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4E && buf[3] === 0x47) return "png";
    if(buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x38) return "gif";
    // webp: RIFF
    if(buf.toString('ascii',0,4) === 'RIFF' && buf.toString('ascii',8,12) === 'WEBP') return "webp";

    return null;
}

// 使用
// const ext = getImageType("./test.png");