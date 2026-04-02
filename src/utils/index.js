// 定义一个响应式函数 reactive
export function isObject(target) {
    // 类型判断
    return typeof target === 'object' && target !== null
}

export function isArray(target) {
    // 判断target是不是一个数组
    return Array.isArray(target)
}

export function isString(target) {
    return typeof target === 'string'
}

export function isBoolean(target) {
    return typeof target === 'boolean'
}

export function isFunction(target) {
    return typeof target === 'function';
}

export function isNumber(target) {
    return typeof target === 'number';
}

export function hasChanged(oldValue, value) {
    if(oldValue !== value && !(Number.isNaN(oldValue) && (Number.isNaN(value)))){
        return true
    }
}

// 驼峰化工具函数
export function camelize(str) {
    // my-first-name
    // mtFirstName
    return str.replace(/-(\w)/g, (_, c) => c.toUpperCase());
}

// 第一个字母大写
export function capitalize(str) {
    return str[0].toUpperCase() + str.slice(1)
}