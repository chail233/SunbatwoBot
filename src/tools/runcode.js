const AsyncFunction = async function(){}.constructor;

export default async function(code){
    const fun = new AsyncFunction(code);
    try{
        let res = await fun();
        if(!res) res = "执行完毕";
        return res;
    }
    catch(err){
        return err;
    }
}
