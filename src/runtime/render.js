import { shapeFlags } from "./vnode.js";
import { patchProps } from "./patchProps.js";
import { mountComponent } from "./component.js";
import { mount } from "./render_bak.js";

export function render(vnode, container) {
    // 如果之前有vnode 则读取出来标记为preVnode 对比vnode 是否有变化
    const preVnode = container._vnode;
    if(!vnode) {
        if(preVnode) {
            // 如果有preVnode 则卸载preVnode
            unmount(preVnode);
        }
    }else{
        patch(preVnode, vnode, container);
    }
    // 存储当前的vnode
    container._vnode = vnode;
}

function unmount(vnode) {
    const { shapeFlag, el } = vnode;
    if(shapeFlag & shapeFlags.COMPONENT) {
        // 如果是组件 则卸载组件
        unmountComponent(vnode);
    }else if (shapeFlag & shapeFlags.FRAGMENT) {
        // 如果是片段 则卸载片段
        unmountFragment(vnode);
    }else {
        // 如果是元素 则卸载元素 对Text, Element执行removeChild
        el.parentNode.removeChild(el);
    }
}

function unmountComponent(vnode) {
    unmount(vnode.component.subTree);
}

function processComponent(n1, n2, container, anchor) {
    if(n1) {
        // shouldComponentUpdate 组件是否需要更新 (默认返回true)
        updateComponent(n1, n2);
    }else {
        mountComponent(n2, container, anchor, patch);
    }
} 

function updateComponent (n1, n2) {
    n2.component = n1.component;
    n2.component.next = n2;
    n2.component.update();
}


function unmountFragment(vnode) {
    let { el: current, anchor: end } = vnode;
    const parentNode = current.parentNode;

    // current 等于 end 时 说明已经遍历完了所有子节点 退出循环
    while(current !== end) {
        // nextSibling的含义为获取某个 DOM 元素紧邻的下一个兄弟节点

        // 先获取current的下一个兄弟节点
        let next = current.nextSibling;
        // 删除current节点
        parentNode.removeChild(current);
        // 更新current为next 这个next也就是刚刚删除的current的下一个兄弟节点 此时current 等于 next 也就是父组件中的第一个子节点 用于下一次循环卸载下一个子节点
        current = next;
    }
    // 删除anchor节点 这样就可以确保片段节点的子节点都被卸载了
    parentNode.removeChild(end);
}



// 判断是否是同一个vnode
function isSameVnode(n1, n2) {
    return n1.type === n2.type && n1.key === n2.key;
}


// patch 函数接收旧 vnode 和新 vnode，通过对比两者差异，决定是卸载旧节点还是复用并更新 DOM。
// n1为旧的vnode n2为新的vnode
function patch(n1, n2, container, anchor) {

    // 如果n1存在且不是同一个属性节点 则删除n1 进行下一步对n2的创建和插入
    if(n1 && !isSameVnode(n1, n2)){
        // anchor是一个动态的节点 它会根据情况变化而变化
        // 1. 当需要更新/删除批量(相同的元素)节点时候 anchor此时会等于批量节点的下一个兄弟节点作为新的anchor
        // 2. 当只有单个节点需要更新/删除的时候，那个该节点的下一个兄弟节点作为新的anchor 确保单个节点的位置不会被改变
        anchor = (n1.anchor || n1.el).nextSibling;
        unmount(n1);
        n1 = null;
    }


    // 创建n2 创建新的DOM 进行类型判断 并插入到 container 中
    const { shapeFlag } = n2;
    if( shapeFlag & shapeFlags.COMPONENT) {
        // 如果是组件 则处理组件
        processComponent(n1, n2, container, anchor);
    }else if (shapeFlag & shapeFlags.TEXT) {
        // 如果是文本 则处理文本
        processText(n1, n2, container, anchor);
    }else if(shapeFlag & shapeFlags.FRAGMENT){
        // 如果是片段 则处理片段
        processFragment(n1, n2, container, anchor);
    }else {
        // 如果是元素 则处理元素
        processElement(n1, n2, container, anchor);
    }
}


function processText(n1, n2, container, anchor) {
    // 如果n1存在 则更新n1的文本内容
    if(n1) {
        n2.el = n1.el;
        n1.el.textContent = n2.children;
    }else{
        mountTextNode(n2, container, anchor);
    }
}

// 处理片段节点 递归处理子节点
function processFragment(n1, n2, container, anchor) {
    // 如果n1存在 则复用n1的el和anchor
    // 如果n1不存在 则创建新的el和anchor节点
    const fragmentStartAnchor = (n2.el = n1 ? n1.el : document.createTextNode(''));
    const fragmentEndAnchor = (n2.anchor = n1 ? n1.anchor : document.createTextNode(''));

    // 如果n1存在 更新n1的子节点
    if(n1) {
        patchChildren(n1, n2, container, fragmentEndAnchor);
    }else {
        container.insertBefore(fragmentStartAnchor, anchor);
        container.insertBefore(fragmentEndAnchor, anchor);
        mountChildren(n2.children, container, fragmentEndAnchor);
    }
}

// 处理元素节点
function processElement(n1, n2, container, anchor) {
    if(n1){
        patchElement(n1, n2, container);
    }else {
        mountElement(n2, container, anchor);
    }
}


// 挂载文本节点
function mountTextNode (vnode, container, anchor) {
    // 创建文本节点
    const textNode = document.createTextNode(vnode.children);
    container.insertBefore(textNode, anchor);
    // 存储当前的文本类型el
    vnode.el = textNode;
}

// 挂载没有父组件的片段 直接生成子dom 到页面body中
function mountFragment (vnode, container) {
    mountChildren(vnode, container);
}

// 如果 children 是字符串 → 直接显示文本
// 如果 children 是数组 → 递归挂载子节点
// 为mountChildren添加anchor属性 确保子节点能够正确挂载 anchor就相当于是一个参考点 是用来确定子节点挂载的位置的
function mountChildren (children, container, anchor) {

    children.forEach((child) => {
        patch(null, child, container, anchor);
    });
}

// 实现挂载元素到网页
function mountElement (vnode, container, anchor) {
    const { type, props, shapeFlag, children } = vnode;
    const el = document.createElement(type);
    patchProps(null, props, el);

    if(shapeFlag & shapeFlags.TEXT_CHILDREN) {
        mountTextNode(vnode, el);
    }else if (shapeFlag & shapeFlags.ARRAY_CHILDREN){
        mountChildren(children, el, null);
    }

    // 添加anchor属性
    container.insertBefore(el, anchor);
    // 存储当前的el
    vnode.el = el;
}

// 更新元素的属性
function patchElement(n1, n2) {
    n2.el = n1.el;
    patchProps(n1.props, n2.props, n2.el);
    patchChildren(n1, n2, n2.el);
}


function unmountChildren(children){
    children.forEach((child) => {
        unmount(child);
    });
}


function patchChildren(n1, n2, container, anchor) {
    const { shapeFlag: preShapeFlag, children: c1 } = n1;
    const { shapeFlag, children: c2 } = n2;

    // n2的类型判断
    if(shapeFlag & shapeFlags.TEXT_CHILDREN) {
        // 如果n1存在 则更新n1的文本内容
        if(preShapeFlag & shapeFlags.TEXT_CHILDREN){
            // 这里的c2是字符串
            container.textContent = c2;
        }else if(preShapeFlag & shapeFlags.ARRAY_CHILDREN){
            // 如果n1类型为数组 则卸载n1的子节点
            unmountChildren(c1, anchor);
            container.textContent = n2.textContent;
        }else {
            container.textContent = n2.textContent;
        }
    }else if (shapeFlag & shapeFlags.ARRAY_CHILDREN){
        // 如果n1存在 则更新n1的子节点
        if(preShapeFlag & shapeFlags.TEXT_CHILDREN){
            container.textContent = '';
            mountChildren(c2, container, anchor);
        }else if(preShapeFlag & shapeFlags.ARRAY_CHILDREN){
            // 只要第一个元素有key，那么就当作都有key
            if(c1[0] && c1[0].key != null && c2[0] && c2[0].key != null) {
                // 执行patchUnkeyChildren函数
                patchKeyChildren(c1, c2, container, anchor);
            }else{
                // 如果没有key 则递归更新子节点
                patchUnkeyChildren(c1, c2, container, anchor);
            }
        }else {
            mountChildren(c2, container, anchor);
        }
    }else{
        if(preShapeFlag & shapeFlags.TEXT_CHILDREN){
            container.textContent = '';
        }else if(preShapeFlag & shapeFlags.ARRAY_CHILDREN){
            unmountChildren(c1, anchor);
        }
    }
}

function patchUnkeyChildren(c1, c2, container, anchor){
     const oldLength = c1.length;
     const newLength = c2.length;
     const commonLength = Math.min(oldLength, newLength);

     // 遍历公共部分 判断是否需要更新
     for(let i = 0; i < commonLength; i++){
        // 公共长度的对比
        patch(c1[i], c2[i], container, null);
     }
     // 如果旧数组的长度大于新数组的长度 则卸载旧数组的子节点
     if(oldLength > newLength){
        unmountChildren(c1.slice(commonLength));
     }

     // 如果旧数组的长度小于新数组的长度 则挂载新数组的子节点
     if(oldLength < newLength){
        mountChildren(c2.slice(commonLength), container, anchor);
     }
}


// diff算法
function patchKeyChildren(c1, c2, container, anchor){
    const map = new Map();

    c1.forEach((prev, j) => {
        map.set(prev.key, {prev, j})
    })

    let maxNewIndexSoFar = 0;

    for(let i = 0; i < c2.length; i++) {
        const next = c2[i];

        const record = map.get(next.key);

        const curAnchor = i === 0 ? c1[0].el : c2[i-1].el.nextSibling;

        if(record) {
            const {prev, j} = record;
            // 先更新子节点
            patch(prev, next, container, anchor);
            // 如果j小于
            if(j < maxNewIndexSoFar) {
            // i是否大于0 如果大于0 则说明不是第一个元素 则需要找到上一个元素的下兄弟元素
            
            // 在移动子节点的位置
            container.insertBefore(next.el, curAnchor);
            }else{
            // 如果j大于等于maxNewIndexSoFar 则说明是新元素 则需要挂载到anchor的后面
            // 赋予maxNewIndexSoFar的值为新元素key的索引值 用于下次循环判断哪些元要挂载到   anchor的后面   
            maxNewIndexSoFar = j;
            }
            map.delete(next.key);
    }else {
        // mount操作
        patch(null, next, container, curAnchor);
        }
    }

    map.forEach(({ prev }) => {
    unmount(prev);
    })
}

// Vue3的diff算法
function patchKeyChildrenVue3(c1, c2, container, anchor){
    let i = 0;
    let e1 = c1.length - 1;
    let e2 = c2.length - 1;
    // 1.从左至右依次比对
    while(i <= e1 && i <= e2 && c1[i].key === c2[i].key) {
        patch(c1[i], c2[i], container, anchor);
        i++;
    }
    // 2.从右至左依次比对
    while(i <= e1 && i <= e2 && c1[e1].key === c2[e2].key) {
        patch(c1[e1], c2[e2], container, anchor);
        e1--;
        e2--;
    }

    // c1: a b c
    // c2: a d b c
    // i = 1
    // e1 = 0
    // e2 = 1
    if(i > e1) {
        // 3. 经过1、2 直接将旧节点比对完，则剩下的新节点之间 mount
        for(let j = 1; j <= e2; j++) {
            // anchor位置
            const nextPos = e2 + 1;
            // 新元素的anchor位置
            const curAnchor =  (c2[nextPos] && c2[nextPos].el) || anchor;
            patch(null, c2[j], container, curAnchor);
        }
    } else if (i > e2) {
        for(let j = i; j <= e1; j++) {
            unmount(c1[j]);
        }
    } else {
        // 4. 若不满足3，采用传统diff算法，但不真的添加和移动，只做标记和删除
        const map = new Map();
        for (let j = i; j <= e2; j++) {
            const prev = c1[j];
            map.set(prev.key, {prev, j})
        }
        let maxNewIndexSoFar = 0;
        // 是否需要移动
        let move = false;
        const source = new Array(e2 - i + 1).fill(-1); 
        const toMounted = [];
        for(let k = 0; k < source.length; k++) {
            const {prev, j} = map.get(next.key);
            const next = c2[k + i ];
            // const curAnchor = i === 0 ? c1[0].el : c2[i-1].el.nextSibling;
            if(map.has(next.key)) {
            // 先更新子节点
            patch(prev, next, container, anchor);
            // 如果j小于
            if(j < maxNewIndexSoFar) {
            // i是否大于0 如果大于0 则说明不是第一个元素 则需要找到上一个元素的下兄弟元素
                move = true
                
            }else{
            // 如果j大于等于maxNewIndexSoFar 则说明是新元素 则需要挂载到anchor的后面
            // 赋予maxNewIndexSoFar的值为新元素key的索引值 用于下次循环判断哪些元要挂载到anchor的后面   
                maxNewIndexSoFar = j;
            }
            source[k] = j;
            map.delete(next.key);
        }else {
            // to do
            toMounted.push(k + 1);
        }
        map.forEach(({ prev }) => {
            unmount(prev);
        });

        if(move){
            // 5.需要移动，则采用最长递增子序列算法，找到最长递增子序列，其他元素进行移动
             const seq = getSequence(source);
             let j = seq.length - 1;
             for(let k = source.length - 1; k >= 0; k--) {
                if(seq[j] === k) {
                    // 不用移动
                    j--;
                }else{
                    const pos = k + i;
                    const nextPos = pos + 1;
                    const curAnchor =  (c2[nextPos] && c2[nextPos].el) || anchor;

                    if(source[k] === -1){
                        // mount操作
                        patch(null, c2[pos], container, curAnchor);
                    }else {
                        // 移动
                        container.insertBefore(c2[pos].el, curAnchor);
                        }   
                    }
                }
            }else if(toMounted.length > 0) {
                for(let k = toMounted.length - 1; k >= 0; k--) {
                    const pos = toMounted[k];
                    const nextPos = pos + 1;
                    const curAnchor =  (c2[nextPos] && c2[nextPos].el) || anchor;
                    patch(null, c2[pos], container, curAnchor);
                }
            }
        }
    }
}


// 最长递增子序列算法
// [10,9,2,5,3,7,101,18]
var getSequence = function(nums) {
    const arr = [nums[0]];
    let position = [0];
    for(let i = 1; i < nums.length; i++) {
        if(nums[i] > arr[arr.length - 1]) {
            arr.push(nums[i]);
            position.push(arr.length - 1);
        }else {
            let left = 0;
            let right = arr.length - 1;
            while(left < right) {
                let mid = ~~((left + right) / 2);
                if(nums[i] > arr[mid]) {
                    left = mid + 1;
                }else if(nums[i] < arr[mid]) {
                    right = mid - 1;
                }else{
                    left = mid;
                    break;
                }
            }
            arr[left] = nums[i];
            position.push(left);
        }
    }
    let cur = arr.length - 1;
    for (let i = position.length - 1; i >= 0 && cur >= 0; i--) {
        if(position[i] === cur) {
            arr[cur] = i;
            cur--;
        }
    }
    return arr;
}
