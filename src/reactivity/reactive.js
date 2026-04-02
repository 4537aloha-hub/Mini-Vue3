// 导入utils模块 类型判断
import { isObject, hasChanged, isArray } from '../utils/index.js'
import { track, trigger } from './effect.js'


// 定义一个WeakMap 用于缓存代理对象 用于判断是否已经被代理过
const proxyMap = new WeakMap() // WeakMap不会阻止垃圾回收 防止内存溢出

// 定义一个响应式函数
export function reactive(target) {
    // 如果不是一个对象 直接返回
    if(!isObject(target)) {
        return target;
    }
    // 如果一个对象已经被代理过了 直接返回代理对象
    if(isReactive(target)) {
        return target;
    }

    // 如果缓存中存在当前对象的代理对象 则直接返回已经被代理过的对象 (也就是同一个响应式对象)
    if(proxyMap.has(target)) {
        return proxyMap.get(target);
    }
    const proxy = new Proxy(target, {
        get(target,key,receiver) {
            // 如果访问到__isReactive属性 则直接返回true 说明当前对象是响应式对象
            if(key === '__isReactive') {
                return true;
            }
            const res = Reflect.get(target,key,receiver);
            // 收集依赖
            track(target,key);
            // 递归判断res是不是一个对象
            // 例如 一个对象里面包含另外一个对象 这时候就要用到递归进行判断
            return isObject(res) ? reactive(res) : res;
        },
        set(target,key,value,receiver) {
            let oldLength = target.length
            const oldValue = target[key];
            const res = Reflect.set(target,key,value,receiver);
            if(hasChanged(oldValue, value)){
                // 如果新值和旧值都存在，就更新依赖
                // 如果只有旧值就不更新依赖
                trigger(target, key)
                if(isArray(target) && hasChanged(oldLength, target.length)) {
                    trigger(target, 'length')
                }
            }
            return res
        },
    });

    // 缓存代理对象 防止重复代理 
    // 如果一个对象里面已经存在之前缓存过的代理对象 则直接返回缓存的代理对象
    proxyMap.set(target,proxy);

    return proxy;
}

// 定义一个方法，判断一个对象是否是响应式对象 如果是 则返回true 否则返回false
export function isReactive(target) {
    // 为target打上一个字符串标记 
    if(target && target.__isReactive){
        return true
    }else {
        return false
    }
}