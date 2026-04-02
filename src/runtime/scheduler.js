// 一个简单的异步队列，利用 Promise.resolve() 来实现微任务
const queue = [];
let isFlushing = false;
const resolvedPromise = Promise.resolve();
let currentFlushPromise = null;

export function nextTick(fn) {
    const p = currentFlushPromise.then(fn); 
    // 兼容await nextTick()的情况，如果没有传入fn，则返回一个Promise对象
    return fn? p.then(fn) : p;
}

export function queueJob(job) {
    if(!queue.length || !queue.includes(job)) {
        queue.push(job);
        // 触发队列刷新
        queueFlush();
    }
   
}

function queueFlush() {
    if(!isFlushing) {
        isFlushing = true;
        currentFlushPromise = resolvedPromise.then(flushJobs);
    }
}

function flushJobs() {
    try {
        for(let i = 0; i < queue.length; i++) {
            const job = queue[i];
            job();
        }
    } finally {
        // 重置队列状态
        isFlushing = false;
        queue.length = 0;
    }

}