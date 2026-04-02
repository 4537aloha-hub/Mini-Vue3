import { capitalize } from '../utils/index.js'
import { NodeTypes, ElementTypes } from './ast.js'
import { resolveComponent } from '../runtime/createApp.js'

export function generate(ast) {

    const returns = traverseNode(ast);

    const code = `
    with(ctx) {
        const { h, Text, Fragment, renderList, resolveComponent } = MiniVue;
        return ${returns}
        
    }`;

    return code;
}

function traverseNode(node, parent) {
    // 只处理这四种节点类型
    switch(node.type) {
        case NodeTypes.ROOT:
            // 递归处理子节点
        if(node.children.length === 1) {
            return traverseNode(node.children[0], node);
        }
        // 如果有多个子节点 递归处理每个子节点
        const result = traverseChildren(node);
        return result;
            break;
        case NodeTypes.ELEMENT:
            return resolveElementAsTNode(node, parent);
            break;
        case NodeTypes.INTERPOLATION:
            // 插值节点的处理
            return createTextVnode(node.content);
            break;
        case NodeTypes.TEXT:
            // 文本节点的处理
            return createTextVnode(node);
            break;
        default:
            break;
    }   
}

function createTextVnode(node) {
    // 文本节点的处理
    const child = createText(node)
    return `h(Text, null, ${child})`
}

// 判断是静态文本节点还是动态文本(插值表达式)节点
function createText({isStatic = true, content = ''} = {} ){
    return isStatic ? JSON.stringify(content) : content
}

// 专门处理特殊指令
function resolveElementAsTNode(node, parent) {

    // 寻找是否有if指令节点 或else-if指令节点 且指令值为true(移除指令节点)
    const ifNode = 
        pluck(node.directives, 'if') || pluck(node.directives, 'else-if');

    // 如果有if指令节点 则需要特殊处理
    if(ifNode){

        const { exp } = ifNode;

        // 递归处理子节点 以防子节点中包含多个指令节点 例如<div v-if="condition" v-for="(item, index) in items"></div> 这种情况的发生
        let consequent = resolveElementAsTNode(node, parent);

        // 如果alternate表达式为空 则默认渲染文本节点
        let alternate;

        const {children} = parent;
        const i = children.findIndex((child) => child === node) + 1;

        // 遍历所有子节点 删除除空文本节点
        for(; i < children.length; i++) { 
            const sibling = children[i];
            if(sibling.type === NodeTypes.TEXT && !sibling.content.trim()) {
                // 删除除空文本节点
               children.splice(i, 1);
               i--;
               // 继续遍历下一个节点
               continue;
            }
            // 找到else指令节点 则跳出循环
            if(sibling.type === NodeTypes.ELEMENT) {

                if(
                    pluck(sibling.directives, 'else') ||
                    pluck(sibling.directives, 'else-if', false)
                ) {
                    // 找到else指令节点 则将alternate表达式设置为else指令节点的子节点
                    alternate = resolveElementAsTNode(sibling, parent);
                    // 删除else指令节点 因为effect中会默认执行一次渲染 所以需要删除else指令节点
                    children.splice(i, 1);
                }
            }
            break;
        }

        // 处理v-if条件表达式：
        // 1.如果condition存在 则根据condition的真假 来判断是否渲染子节点
        // 2.如果condition不存在 则渲染alternate表达式
        return `${exp.content} ? ${consequent} : ${alternate || createTextVnode()}`
    } else {
        
    }

    // 寻找for指令节点
    const forNode = pluck(node.directives, 'for')
    // 如果有for指令节点 则需要特殊处理
    if(forNode){
        // (item, index) in items
        const { exp } = forNode;
        const [args, source] = exp.content.split(/\sin\s|\sof\s/)
        return `h(Fragment, null, renderList(${source.trim()}, ${args.trim()} => ${resolveElementAsTNode(node, parent)}))`
    }
    return createElementVnode(node)
}

function createElementVnode(node) {
    const { children, tagType } = node

    const tag = tagType === ElementTypes.ELEMENT ? `"${node.tag}"` : `resolveComponent("${node.tag}")`

    const vModel = pluck(node.directives, 'model')
    // <input v-model="value" />>
    // 本质上是
    // <input v-model="value" @input="($event) => test = $event.target.value" />>

    if(vModel) {
        // 处理v-model指令节点
        node.directives.push({
            type: NodeTypes.DIRECTIVE,
            name: 'bind',
            exp: vModel.exp, // 表达式节点
            arg: {
                type: NodeTypes.SIMPLE_EXPRESSION,
                content: 'value',
                isStatic: true,
            } // 表达式节点
        }, 
        {
            type: NodeTypes.DIRECTIVE,
            name: 'on',
            exp: {
                    type: NodeTypes.SIMPLE_EXPRESSION,
                    content: `($event) => ${vModel.exp.content} = $event.target.value`,
                    isStatic: false,
                }, // 表达式节点
                arg:{
                    type: NodeTypes.SIMPLE_EXPRESSION,
                    content: 'input',
                    isStatic: true,
                }
    })
}

    const propArr = createPropArr(node)

    const propStr =  propArr.length ? `{ ${propArr.join(',')} }` : 'null'

    if(!children.length) {

        if(propStr === 'null'){
            return `h(${tag})`
        }

        return `h(${tag}, ${propStr})`

    }else {

        let childrenStr = traverseChildren(node)
        return `h(${tag}, ${propStr}, ${childrenStr})`
    }
}

function createPropArr(node) {
    const {props, directives} = node
    return [
        // 返回键值对数组
        ...props.map(prop =>  `${prop.name}: ${createText(prop.value)}`),
    
        ...directives.map(dir => {
            switch(dir.name) {
                case 'bind':
                    return `${dir.arg.content}: ${createText(dir.exp)}`
                    break;

                case 'on':
                    const eventName = `on${capitalize(dir.arg.content)}`

                    const exp = dir.exp.content

                    // 判断是否以括号结尾, 并且不包含 "=>"
                    if(/\([^)]*?\)$/.test(exp) && !exp.includes('=>')){
                        exp = `$event => (${exp})`
                    }

                    return `${eventName}: ${exp}`
                    break;

                case 'html' :
                    return `innerHTML: ${createText(dir.exp)}`
                    break;
                default:
                    return `${dir.name}: ${createText(dir.exp)}`
                    break;
            }
        } 
            
        )
    ]
}

function traverseChildren(node) {
    const { children } = node

    // 如果有多个子节点 递归处理每个子节点
    const results = []

    for(let i = 0; i < children.length; i++) {
        const child = children[i];
        results.push(traverseNode(child, node));
    }
    // 如果有多个子节点 递归处理每个子节点 并将结果用添加到results数组中
    return `[${results.join(',')}]`
}


function pluck(directives, name, remove = true){
    const index = directives.findIndex(dir => dir.name === name);
    const dir = directives[index];

    if(index > -1 && remove){ 
        directives.splice(index, 1)
    }

    return dir;
}