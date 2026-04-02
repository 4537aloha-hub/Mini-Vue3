import { h } from "./vnode.js";
import { render } from "./render.js";
import { camelize, capitalize, isString } from "../utils/index.js";

let components;

export function createApp(rootComponent) {
    components = rootComponent.components || {};
    const app = {
        mount(rootContainer) {
            // 如果是字符串，就给它转换成dom对象
            if(isString(rootContainer)) {
                rootContainer = document.querySelector(rootContainer);
            }

            if(!rootComponent.render && !rootComponent.template) {
                // 如果没有render函数，也没有template，且 rootContainer 有初始内容，再作为 template
                const containerHtml = rootContainer.innerHTML.trim();
                if(containerHtml) {
                    rootComponent.template = rootContainer.innerHTML;
                }
            }
            // 済空rootContainer.innerHTML
            // 因为render函数会将组件的vnode渲染到rootContainer中
            rootContainer.innerHTML = '';
            
            render(h(rootComponent), rootContainer);
        },
    }
    return app;
}

export function resolveComponent(name) {
    const component = components && (components[name] || components[camelize(name)] || components[capitalize(camelize(name))]);
    return component || name;
}