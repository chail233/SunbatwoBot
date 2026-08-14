const api = "https://api.yppp.net/pc.php?return=json";

export default async function (){
    const res = await fetch(api);
    const data = await res.json();
    return `点击查看${data.acgurl}`;
}