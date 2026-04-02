import { hasChanged, isObject } from "../utils/index.js";
import { reactive } from "./reactive.js";
import { track, trigger } from "./effect.js"


export function ref(value)  {
    if(isRef(value)) {
        return value
    }
    return new RefImpl(value);
}


function isRef(value) {
    // 转换成false
    return !! (value && value.__isRef)
}


class RefImpl {
    constructor(value) {
        this.__isRef = true;
        this._value = convert(value);
    }

    get value() {
        track(this, 'value')
        return this._value;
    }

    set value(newValue) {
        if(hasChanged(newValue, this._value)) {
            this._value = convert(newValue);
            trigger(this, 'value');
        }
    }
}

function convert(value) {
    return isObject(value) ? reactive(value) : value 
}