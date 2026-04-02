import { hasChanged, isFunction } from "../utils/index.js";
import { track, trigger } from "./effect.js";
import { effect } from "./effect.js";

export function computed(getterOrOptions) {
    let getter, setter;
    if(isFunction(getterOrOptions)){
        getter = getterOrOptions;
        setter = () => {
            console.warn('computed is readonly');
        };
    }else{
        getter = getterOrOptions.get
        setter = getterOrOptions.set
    }
    return new ComputedImpl(getter, setter);

}

// 懒计算 + 收集依赖
class ComputedImpl {
    constructor(getter, setter) {
        // 缓存值
        this._setter = setter;
        this._value = undefined;
        this._dirty = true;
        this.effect = effect(getter, {
            lazy: true,
            scheduler:() => {
                if(!this._dirty) {
                    this._dirty = true;
                    trigger(this, 'value')
                }
            },
        });
    }

    get value() {
        if(this._dirty) {
            // 让当前的值赋值给effect里面的fn函数
            this._value = this.effect();
            this._dirty = false;
            track(this, 'value')
        }
        return this._value;
    }

    set value(newValue) {
        this._setter(newValue);
    }
}