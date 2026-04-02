export const NodeTypes = {
    ROOT: 'ROOT',
    ELEMENT: 'ELEMENT',
    TEXT: 'TEXT',
    SIMPLE_INTERPOLATION: 'SIMPLE_INTERPOLATION',
    INTERPOLATION: 'INTERPOLATION',
    ATTRIBUTE: 'ATTRIBUTE',
    DIRECTIVE: 'DIRECTIVE',
}

// 元素节点
export const ElementTypes = {
    ELEMENT: 'ELEMENT',
    TEXT: 'TEXT',
   }

// 创建根节点
export function createRoot(children) {
    return {
        type: NodeTypes.ROOT,
        children
    }
}