import { isBoolean } from "../utils/index.js";

// 更新元素的属性
const domPropsRE = /[A-Z]|^(value|checked|selected|muted|disabled)$/;
export function patchProps(oldProps, newProps, el) {
    if(oldProps === newProps) {
        return;
    }
    
    // 如果oldProps或newProps为空 则赋值为空对象
    oldProps = oldProps || {};
    newProps = newProps || {};

    for (const key in newProps) {
        if(key === 'key') {
            continue;
        }
        const next = newProps[key];
        const prev = oldProps[key];
        if(next !== prev) {
            patchDomProps(key, next, prev, el);
        }
    }
    // 如果newProps中没有当前的属性 则移除当前的属性
    for(const key in oldProps) {
        if(key !== 'key' && newProps[key] == null) {
            patchDomProps(oldProps[key], null, el);
        }
    }
}

export function patchDomProps(key, next, prev, el) {
    switch(key) {
    case 'class':
        // 如果next为false或null 则赋予空字符串
        el.className = next || '';
        break;
    case 'style':
        // 如果next为false或null 则移除style属性
        if(next == null) {
            el.removeAttribute('style');
        }else {
            for (const styleName in next || {}) {
                el.style[styleName] = next[styleName];
            }
            if(prev) {
                for(const styleName in prev) {
                    // 如果next中没有当前的styleName 则清空当前的styleName
                    if(next[styleName] == null) {
                    el.style[styleName] = '';
                    }
                }
            }
        } 
        break;
    default:
        if(/^on[^a-z]/.test(key)) {
            const eventName = key.slice(2).toLowerCase();
            // 如果prev(旧的事件)存在 则移除当前的事件
            if(prev) {
                // 如果next中没有当前的事件 则移除当前的事件
                el.removeEventListener(eventName, prev);
            }
            // 如果next(要更新的事件)存在 则添加当前的事件
            if(next) {
                el.addEventListener(eventName, next);
            }
        }else if (domPropsRE.test(key)) {
            if(next === '' && isBoolean(el[key])) {
                next = true
            }
            el[key] = next
        }else {
            if(next === null || next === false) {
                el.removeAttribute(key);
            }else {
                el.setAttribute(key, next);
            }
        }
        break;
    }
}