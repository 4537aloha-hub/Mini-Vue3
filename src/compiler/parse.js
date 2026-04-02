import { NodeTypes, createRoot, ElementTypes } from "./ast.js";
import { isVoidTag, isNativeTag } from "./index.js";
import { camelize } from "../utils/index.js";

// 接收一个字符串模板
export function parse(template) {
    const context = createParserContext(template);
    const children = parseChildren(context);
    return createRoot(children);
}

// 创建解析上下文
export function createParserContext(template) {
    return {
        options: {
            delimiters: ['{{', '}}'],
            isVoidTag,
            isNativeTag,
        },
        source: template,
    }
}

function parseChildren(context) {
    const nodes = [];
    while(!isEnd(context)){
        const s = context.source;
        let node
        if(s.startsWith(context.options.delimiters[0])) {
            node = parseInterpolation(context);
        }else if (s[0] === '<') {
            node = parseElement(context);
        }else {
            node = parseText(context);
        }
        nodes.push(node);
    }

    let removedWhitespace = false;
    
    for (let i=0;i<nodes.length;i++) {
        const node = nodes[i];
        
        if(node && node.type === NodeTypes.TEXT) {
            // 判断 是否是 纯空白/换行
            // 
            if(!/[^\t\n\r\f ]/.test(node.content)) {
                const prev = nodes[i-1];
                const next = nodes[i+1];

                // 删除元素之间的空白
                if(!prev || !next || (prev.type === NodeTypes.ELEMENT && next.type === NodeTypes.ELEMENT)) {
                    removedWhitespace = true;
                    nodes[i] = null;
                }else {
                    node.content = ' ';
                }
            } else {
                // 把多个空格/换行 变成 一个空格
                node.content = node.content.replace(/[\t\n\r\f ]+/g, ' ');
            }
        }
    }

    return nodes.filter(Boolean);
}

// 解析文本节点
function parseText(context) {
    let endIndex = context.source.length;
    const endTokens = ['<', context.options.delimiters[0]];

    for(let i = 0; i < endTokens.length; i++) {
        let index = context.source.indexOf(endTokens[i]);
        if(index !== -1 && index < endIndex) {
            endIndex = index;
        }
    }

    const content = parseTextData(context, endIndex);
    advanceBy(context, endIndex);

    return {
        type: NodeTypes.TEXT,
        content,
    }
}

function parseTextData(context, length) {
    const content = context.source.slice(0, length);
    return content;
}

// 解析插值 {{ xxx }}
function parseInterpolation(context) {
    // 从content中提取出open和close 用来作为插值表达式的边界符
    const [open, close] = context.options.delimiters;

    // 跳过 {{ 本身
    advanceBy(context, open.length);

    const closeIndex = context.source.indexOf(close);
    const content = parseTextData(context, closeIndex).trim();

    // 跳过 }} 本身
    advanceBy(context, closeIndex);

    // 跳过 }} 两个字符的长度
    advanceBy(context, close.length);

    return {
        type: NodeTypes.INTERPOLATION,
        content: {
            type: NodeTypes.SIMPLE_INTERPOLATION,
            content,
            isStatic: false,
        }
    }
}

// 解析元素
function parseElement(context) {
    const element = parseTag(context);

    if(element.isSelfClosing || context.options.isVoidTag(element.tag)) {
        return element;
    }

    element.children = parseChildren(context);
    parseTag(context);

    return element;
}

// 解析标签
function parseTag(context) {
    const match = /^<\/?([a-z][^\t\r\n\f />]*)/i.exec(context.source);
    const tag = match[1];

    advanceBy(context, match[0].length);
    advanceSpaces(context);

    const { props, directives } = parseAttributes(context);

    const isSelfClosing = context.source.startsWith('/>');
    advanceBy(context, isSelfClosing ? 2 : 1);

    const tagType = isComponent(tag, context) 
        ? ElementTypes.COMPONENT 
        : ElementTypes.ELEMENT;

    return {
        type: NodeTypes.ELEMENT,
        tag,
        tagType,
        props,
        directives,
        isSelfClosing,
        children: [],
    };
}

// 解析所有属性
function parseAttributes(context) {
    const props = [];
    const directives = [];

    while(context.source.length && 
          !context.source.startsWith('>') && 
          !context.source.startsWith('/>')) 
    {
        const attr = parseAttribute(context);
        
        if(attr.type === NodeTypes.DIRECTIVE) {
            directives.push(attr);
        } else {
            props.push(attr);
        }
    }
    return { props, directives };
}

// 解析单个属性
function parseAttribute(context) {
    const match = /^[^\t\r\n\f />][^\t\r\n\f />=]*/.exec(context.source);
    const name = match[0];

    advanceBy(context, name.length);
    advanceSpaces(context);

    let value;

    if(context.source[0] === '=') {
        advanceBy(context, 1);
        advanceSpaces(context);
        value = parseAttributeValue(context);
        advanceSpaces(context);
    }

    if(/^(:|@|v-)/.test(name)) {
        let dirName, argContent;

        if(name[0] === ':') {
            dirName = 'bind';
            argContent = name.slice(1);
        }else if(name[0] === '@') {
            dirName = 'on';
            argContent = name.slice(1);
        }else if(name.startsWith('v-')) {
            [dirName, argContent] = name.slice(2).split(':')
        }

        return {
            type: NodeTypes.DIRECTIVE, 
            name: dirName,
            exp: value && {
                type: NodeTypes.SIMPLE_INTERPOLATION,
                content: value.content,
                isStatic: false,
            },
            arg: argContent && {
                type: NodeTypes.SIMPLE_INTERPOLATION,
                content: camelize(argContent),
                isStatic: true,
            },
        };
    }

    return {
        type: NodeTypes.ATTRIBUTE,
        name,
        value: value && {
            type: NodeTypes.TEXT,
            content: value.content,
        }
    };
}

// 解析属性值
function parseAttributeValue(context) {
    const quote = context.source[0];
    advanceBy(context, 1);

    const endIndex = context.source.indexOf(quote);
    const content = parseTextData(context, endIndex);

    // 跳过属性值的长度
    advanceBy(context, endIndex);
    
    // 跳过属性值的引号
    advanceBy(context, 1);    
    return { content };
}

function isComponent(tag, context) {
    return !context.options.isNativeTag(tag);
}

function isEnd(context) {
    const s = context.source;
    return !s || s.startsWith('</');
}

// 前进指针
function advanceBy(context, numberOfCharacters){
    context.source = context.source.slice(numberOfCharacters);
}

// 跳过空格（修复拼写错误 advance）
function advanceSpaces(context){
    const match = /^[\t\r\n\f ]+/.exec(context.source);
    if(match){
        advanceBy(context, match[0].length);
    }
}