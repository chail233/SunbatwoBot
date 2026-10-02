/**
 *模型可以调用的工具
 */
const tools = [
    {
        type: "function",
        function: {
            name: "test_function",
            description: "测试工具，用于测试能否正常调用工具",
            parameters: {},
        },
    }
]

export default tools;


function testTool(){
    return "114514";
}


export const toolMap = new Map(
    [
        ["test_function", testTool]
    ]
);