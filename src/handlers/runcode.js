import {model} from "../LLM/api.js"

const AsyncFunction = async function(){}.constructor;

export default async function(code){
    const fun = new AsyncFunction(code);
    try{
        return await fun();
    }
    catch(err){
        return err;
    }
}
