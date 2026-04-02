import { isNumber, isObject, isArray, isString } from "../../utils/index.js";

export function renderList(source, renderItem) {
    // item in imtes array
    //  item in obj Object
    // item in 10 nummber
    // item in 'abcd' string

    const nodes = [];

    if(isNumber(source)){

        // 数字的处理
        for(let i = 0; i < source; i++){
            // 因为数组的索引是从0开始的 所以需要+1
            nodes.push(renderItem(i+1, i));
        }

    } else if(isString(source) || isArray(source)){

        // 字符串或数组的处理
        for (let i = 0; i < source.length; i++) {
            nodes.push(renderItem(source[i], i));
        }
        
    } else if(isObject(source)){

        // 对象的处理
        const keys = Object.keys(source)[0];
        keys.forEach((key, index) => {
            nodes.push(renderItem(source[key], key, index));
        })
    }
    
    return nodes;
}