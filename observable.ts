import { ExtraTags } from './utils/interfaces'
import { isPassType, shallowCopy } from "./utils/index";
import { ObsStore } from './obs-store'
const $felix = Symbol("tags")
const proxyTraps: ProxyHandler<object> = {
    get(target: object, name: PropertyKey): unknown {
        if (name === "__getTarget") {
            return target;
        } else if (name === "__isProxy") {
            return true
        }
        let targetProp = target[name];
        if (targetProp instanceof Object && targetProp !== null && target.hasOwnProperty(name)) {
            if (targetProp[$felix] && targetProp.__isProxy) {
                return targetProp
            }
        }
        if (isPassType(targetProp) && name != $felix) {
            let tags: ExtraTags
            if (!targetProp[$felix]) {
                tags = { ...target[$felix], path: [...target[$felix].path] }
            } else {
                tags = { ...targetProp[$felix] }
            }
            let lastKey = tags.path.length > 0 ? tags.path[tags.path.length - 1] : null
            if (lastKey?.toString() !== name) {
                if (Array.isArray(target)) {
                    tags.path.push(parseInt(name as string))
                } else {
                    tags.path.push(name)
                }
            }
            extend_(targetProp, $felix, tags)
            return asObservable(targetProp)
        }
        return targetProp
    },
    set(target: object, name: PropertyKey, value: any, receiver: any): boolean {
        if (value && value.__isProxy) value = value.__getTarget;
        let targetProp = target[name];
        if (targetProp !== value && target[$felix]) {
            let type = "update";
            if (typeof targetProp === "undefined") type = "add";
            const tags: ExtraTags = target[$felix]
            //获取原来的state
            const store = ObsStore.getInstance()
            const prevValue = receiver[name]
            const prevTags = prevValue ? prevValue[$felix] : null
            if (prevTags) {
                store.removeWatcher([tags.name, ...prevTags.path])
            }
            const change = {
                type,
                property: name,
                prevValue: prevValue ? shallowCopy(prevValue) : null,
                newValue: value,
                name:tags.name,
                path: tags.path.length === 0 ? [name] : [...tags.path]
            }
            let lastKey = change.path.length > 0 ? change.path[change.path.length - 1] : null
            if (lastKey?.toString() !== name) {
                change.path.push(name)
            }
            store.addChanges(change)
            target[name] = value
            store.setState(tags.name, null, value, { key: name as string, value, path: change.path })
            store.trigger(tags.name, { key: name as string, path: change.path })
        }
        return true
    },
    deleteProperty(target: any, name: PropertyKey): boolean {
        if (target[$felix]) {
            const tags: ExtraTags = target[$felix]
            const store = ObsStore.getInstance()
            var previousValue = Object.assign({}, target);
            store.addChanges({
                type: "delete",
                property: name,
                prevValue: previousValue[name],
                newValue: null,
                name:tags.name,
                path: tags.path
            })
            delete target[name]
            store.trigger(tags.name, { key: name as string, path: tags.path })
        }
        return true
    }
}

function _isObservable(value) {
    return value["__isProxy"]
}
function extend_(target, key, tag: ExtraTags) {
    if (!tag) {
        return false
    }
    return Reflect.defineProperty(target, key, {
        configurable: true,
        enumerable: false,
        value: { ...tag }
    })
}


export function asObservable(v: any, tags?: ExtraTags) {
    if (_isObservable(v)) {
        return v
    }
    if (isPassType(v)) {
        if (tags) {
            extend_(v, $felix, { ...tags })
        }
        return createObservable(v)
    }

    return v
}


function createObservable(value) {
    if (typeof (value) !== "undefined") {
        let proxyTarget = new Proxy(value, proxyTraps)
        return proxyTarget
    }
    return value
}

export function observable(target: any, key: string, descriptor: any): any {
    let value = descriptor ? descriptor.initializer.call(this) : null;
    let tags: ExtraTags = {
        name: target.constructor.name,
        path: [key]
    }
    const store = target.constructor.getInstance()
    store.initState(tags.name, key, value)
    return {
        enumerable: true,
        configurable: true,
        get: function () {
            return store.getState(tags.name, key)
        },
        set: function (v: any) {
            store.setState(tags.name, key, v)
            store.addChanges({
                type: "update",
                property: key,
                newValue: v,
                name:tags.name,
                path: tags.path
            })
            store.trigger(tags.name, { key: key, path: tags.path })
            return true
        }
    }
}