import { isString, isNumber, isArray, isObject } from "../utils/index.js";

export const shapeFlags = {
    ELEMENT: 1,
    TEXT: 1 << 1,
    FRAGMENT: 1 << 2,
    COMPONENT: 1 << 3,
    TEXT_CHILDREN: 1 << 4,
    ARRAY_CHILDREN: 1 << 5,
    CHILDREN: (1 << 4) | (1 << 5),
} ;

export const Text = Symbol('Text')
export const Fragment = Symbol('Fragment')

/**
 *  @param {string | Object | Text | Fragment} type
 *  @param {Object | null} props
 *  @param {string | number | Array | null} chilredn
 *  @returns Vnode
 */

export function h(type, props, children) {
    // h类型的判断
    let shapeFlag = 0
    if(isString(type)) {
        shapeFlag = shapeFlags.ELEMENT
    }else if (type === Text) {
        shapeFlag = shapeFlags.TEXT
    }else if (type === Fragment) {
        shapeFlag = shapeFlags.FRAGMENT
    }else {
        shapeFlag = shapeFlags.COMPONENT
    }

    if (isString(children) || isNumber(children)) {
        shapeFlag |= shapeFlags.TEXT_CHILDREN
        // 如果是数字 将数字转换成字符串
        children = children.toString();
    }else if (isArray(children)) {
        shapeFlag |= shapeFlags.ARRAY_CHILDREN
        children = children.map(normalizeVNode)
    }

    return {
    type,
    props,
    children,
    shapeFlag,
    el: null,
    anchor: null,
    key: props && props.key,
    component: null, // 专门用于存储组件实例
    }
}

export function normalizeVNode(vnode) {
    if(isArray(vnode)) {
        return h(Fragment, null, vnode);
    }
    if(isObject(vnode)) {
        return vnode;
    }

    // 其他类型 都转换成字符串和数字类型
    return h(Text, null, vnode.toString());
}