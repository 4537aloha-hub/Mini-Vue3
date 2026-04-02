// 让嵌套 effect 执行完之后还能“回到上一个 effect”
const effefctStack = [];

// 全局变量 存储所有的副作用函数
let activeEffect;

export function effect(fn, options = {}) {
    // 副作用函数 默认会把函数执行一次
    const effectFn = () => {
    try {
        // 把当前的副作用函数赋值给全局变量
        activeEffect = effectFn;
        // 入栈
        effefctStack.push(activeEffect);
        // 触发从get 到 track
        return fn();
    } finally {
        // 出栈
        effefctStack.pop();
        // 清空当前的副作用函数 拿到栈里面最后一个值
        activeEffect = effefctStack[effefctStack.length - 1]
    }
   };

   if(!options.lazy){
    effectFn();
   }

    // 默认执行一次
    effectFn.scheduler = options.scheduler;
    return effectFn;
}


// 定义一个全局变量 存储所有的依赖

const targetMap = new WeakMap();

export function track(target,key) {
    // 如果没有副作用函数 直接返回
    if(!activeEffect) {
        return
    }
    let depsMap = targetMap.get(target);
    // 如果没有当前的target 则创建一个空数组
    if(!depsMap) {
        targetMap.set(target, (depsMap = new Map()));
    }

    // 如果没有当前的key 则创建一个空数组
    let deps = depsMap.get(key);
    if(!deps) {
        depsMap.set(key, (deps = new Set()));
    }

    deps.add(activeEffect)
}

export function trigger(target,key) {
    const depsMap = targetMap.get(target);
    if(!depsMap) {
        return;
    }
    const deps = depsMap.get(key);
    if(!deps) {
        return;
    }
    deps.forEach(effectFn => {
        // 如果调度程序存在 优先执行调度程度
        if(effectFn.scheduler){
            effectFn.scheduler(effectFn);
        }else{
            effectFn();
    };
    })
}