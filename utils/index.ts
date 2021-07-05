const plainObjectString = Object.toString()

export function isObject(value: any): value is Object {
    return value !== null && typeof value === "object"
}

export function isPlainObject(value) {
    if (!isObject(value)) return false
    const proto = Object.getPrototypeOf(value)
    if (proto == null) return true
    return proto.constructor?.toString() === plainObjectString
}

export function isPassType(v: unknown) {
    return (isPlainObject(v) || Array.isArray(v)) ? true : false
}

export function shallowCopy(v: any) {
    return isObject(v) ? { ...v } : (Array.isArray(v) ? [...v] : v)
}