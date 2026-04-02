import { shapeFlags } from "./vnode.js"


// vnode = 虚拟元素节点的标签
export function render(vnode, container) {
    // 挂载
    mount(vnode, container);
}

export function mount (vnode, container) {
    const { shapeFlag } = vnode;
    // 如果元素存在
    if(shapeFlag & shapeFlags.ELEMENT) {
        // 挂载元素到网页中
        mountElement(vnode, container)
    }else if (shapeFlag & shapeFlags.TEXT) {
        mountTextNode(vnode, container)
    }else if (shapeFlag & shapeFlags.FRAGMENT) {
        mountFragment(vnode, container)
    }else {
        mountComponet(vnode, container)
    }
}

// 实现挂载元素到网页
function mountElement (vnode, container) {
    const { type, props } = vnode;
    const el = document.createElement(type);
    mountProps(props, el);
    mounteChildren(vnode, el)
    container.appendChild(el);
    // 存储当前的el
    vnode.el = el;
}
function mountTextNode (vnode, container) {
    const textNode = document.createTextNode(vnode.children);
    container.appendChild(textNode);
    // 存储当前的文本类型el
    vnode.el = textNode;
}

// Fragment 本身不生成 DOM
// 只负责把 children 挂到 container 这是为了应对 没有父组件的情况，比如在 render 函数中直接挂载到 body 中
function mountFragment (vnode, container) {
    mounteChildren(vnode, container);
}

// 暂不实现
function mountComponet (vnode, container) {}

// 如果 children 是字符串 → 直接显示文本
// 如果 children 是数组 → 递归挂载子节点
function mounteChildren (vnode, container) {
    const { shapeFlag, children } = vnode
    if(shapeFlag & shapeFlags.TEXT_CHILDREN) {
        mountTextNode(vnode, container);
    }else if (shapeFlag & shapeFlags.ARRAY_CHILDREN){
        children.forEach((child) => {
            mount(child, container);
        });
    }
}

// 事件挂载
const domPropsRE = /[A-Z]|^(value|checked|selected|muted|disabled)$/;
function mountProps (props, el) {
    for (const key in props) {
        let value = props[key];
        switch(key) {
            case 'class':   
                el.className = value;
                break;
            case 'style':
                for (const styleNmae in value ) {
                    el.style[styleNmae] = value[styleNmae];
                }
                break;
            default:
                if(/^on[^a-z]/.test(key)) {
                    const eventName = key.slice(2).toLowerCase();
                    el.addEventListener(eventName, value);
                }else if (domPropsRE.test(key)) {
                    if(value === '' && typeof el[key] === 'boolean') {
                        value = true
                    }
                    el[key] = value
                }else {
                    if(value === null || value === false) {
                        el.removeAttribute(key);
                    }else {
                        el.setAttribute(key, value);
                    }
                }
                break;
        }
    }
}