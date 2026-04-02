import { reactive } from "../reactivity/reactive.js";
import { effect } from "../reactivity/effect.js";
import { queueJob } from "./scheduler.js";
import { compile } from "../compiler/compile.js";

import { h, Fragment } from "./vnode.js";
import { normalizeVNode } from "./vnode.js";

function updateProps(instance, vnode) {
    const { type: Component, props: vnodeProps } = vnode;
    const props = instance.props = {};
    const attrs = instance.attrs = {};

    for(const key in vnodeProps) {
        if(Component.props?.includes(key)) {
            props[key] = vnodeProps[key];
        } else {
            attrs[key] = vnodeProps[key];
        }
    }

    instance.props = reactive(instance.props);
    
}

function fallThrought(instance, subTree) {
    //  如果attrs中有属性 则将attrs中的属性合并到subTree的props中
    if(Object.keys(instance.attrs).length) {
        subTree.props = {
            ...subTree.props,
            ...instance.attrs,
        };
    }
}

export function mountComponent (vnode, container, anchor, patch) {
    const {type: Component} = vnode;

    const instance = (vnode.component = {
        props: null,
        attrs: null,
        setupState: null,
        ctx: null,
        subTree: null,
        isMounted: false,
        update: null,
        next: null,
    });
    // 初始化props和attrs
    updateProps(instance, vnode);

    instance.setupState = Component.setup?.(instance.props, {
        attrs: instance.attrs,
    });

    instance.ctx = {
        ...instance.props,
        ...instance.setupState,
    };

    if(!Component.render && Component.template) {
        let {template} = Component;
        if(template[0] === '#') {
            const el = document.querySelector(template);
            template = el ? el.innerHTML : '';
        }
        const code = compile(template);
        Component.render = new Function('ctx', code);
        console.log(Component.render);
    }

    if(!Component.render) {
        Component.render = () => h(Fragment, null, []);
    }

    instance.update = effect(() => {

    if(!instance.isMounted) {
        // 第一次挂载
        const subTree = (instance.subTree = normalizeVNode(Component.render(instance.ctx)
        ));

        fallThrought(instance, subTree);

        patch(null, subTree, container, anchor);
        vnode.el = subTree.el;
        instance.isMounted = true;

    }else {
        // 更新

        if(instance.next) {
            // 被动更新
            vnode = instance.next;
            // 清空next
            instance.next = null;
            // 重新初始化props和attrs
            updateProps(instance, vnode);
            // 重新设置ctx
            instance.ctx = {
                ...instance.props,
                ...instance.setupState,
            };
        }

        const prev = instance.subTree;
        const subTree = instance.subTree = normalizeVNode(Component.render(instance.ctx));

        fallThrought(instance, subTree);

         patch(prev, subTree, container, anchor);
         vnode.el = subTree.el;
       }   
    },{
        scheduler: queueJob,
    });
}

