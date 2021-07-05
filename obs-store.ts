import { ObsTarget, ObjPath, ChangeContext, ExtraProps } from './utils/interfaces'
import { asObservable } from './observable'
import { isPassType } from './utils/index';
import ObsBase from './obs-base'
interface Obss {
    [className: string]: ObsStore<unknown>;
}

export class ObsStore<T>{
    private _storeState: Readonly<any> = null;
    private static _instances: Obss = {};
    private _globalKey = 1;
    public static getInstance() {
        const className = this.name;
        if (!ObsStore._instances || !ObsStore._instances[className]) {
            if (className === 'ObsStore') {
                ObsStore._instances[className] = new ObsStore();
            } else {
                const obss = Object.create(this.prototype);
                ObsStore._instances[className] = new obss.constructor();
            }
        }
        return ObsStore._instances[className];
    }

    addChanges(change: ChangeContext) {
        ObsBase.changes.push(change)
    }

    setStateObs(name: string, key: string, value: T) {
        if (this._storeState.hasOwnProperty(name)) {
            let state = this._storeState[name]
            if (state.hasOwnProperty(key)) {
                state[key] = value
            }
        }
    }
    setState(name: string, key: string, value: T, extra?: ExtraProps) {
        if (this._storeState.hasOwnProperty(name)) {
            let state = this._storeState[name]
            if (extra) {
                this.processExtraProps(state, extra)
            } else {
                if (state.hasOwnProperty(key)) {
                    this._setStateByKey(name, key, value)
                }
            }

        }
    }

    trigger(name: string, extra?: ExtraProps) {
        if (extra) {
            this._notify([name, ...extra.path])
        } else {
            this._notify([name])
        }
    }

    getState(name: string, key: string, extra?: ExtraProps) {
        if (this._storeState.hasOwnProperty(name)) {
            let state = this._storeState[name]
            if (extra) {
                return this.processExtraProps(state, extra)
            } else {
                if (state.hasOwnProperty(key)) {
                    let targetState = state[key]
                    return targetState
                }
            }

        }
    }

    initState(name: PropertyKey | string, key: string, state: any) {
        this._setStateByKey(name as string, key, state)
    }

    private _setStateByKey(name: string, key: string, state: any) {
        let newState = { [key]: state }
        if (this._storeState && this._storeState.hasOwnProperty(name)) {
            newState = { ...this._storeState[name], ...newState }
        }
        this._storeState = {
            ...(this._storeState ? this._storeState : {}),
            [name]: asObservable({ ...newState }, { name, path: [] }),
        }
        return newState
    }


    private _notify(pathArr: ObjPath) {

        const pathStr = pathArr.join("/")
        if (ObsBase.observables.has(pathStr)) {
            //执行宏任务，避免多次重复渲染
            setTimeout(() => {
                let change: ChangeContext
                if (ObsBase.changes.length > 1) {
                    change = ObsBase.changes.pop()
                } else {
                    change = ObsBase.changes.pop()
                }
                if (!change) {
                    return
                }
                if (ObsBase.changes.length > 0) {
                    let forChanges = [...ObsBase.changes, change]
                    forChanges = forChanges.filter((c) => ~ObsBase.subListPath.indexOf([c.name, ...c.path].join('/')))
                    if (forChanges.length > 0) {
                        forChanges=[...forChanges]
                        setTimeout(()=>{
                            forChanges.forEach((c) => {
                                let tmpPathStr = [c.name, ...c.path].join('/')
                                ObsBase.observables.get(tmpPathStr).forEach((func: ObsTarget) => {
                                    func(c)
                                })
                            })
                        },20)
                    } 
                    ObsBase.changes = []
                }
                ObsBase.observables.get(pathStr).forEach((func: ObsTarget) => {
                    func(change)
                })

            }, 10);
        }
        pathArr.pop()
        if (pathArr.length > 0) {
            this._notify(pathArr)
        }

    }

    public watcher(pathArr: ObjPath, cb: ObsTarget) {
        const pathStr = pathArr.join("/")
        if (ObsBase.observables.has(pathStr)) {
            ObsBase.observables.get(pathStr).push(cb)
        } else {
            ObsBase.observables.set(pathStr, [cb])
        }
        return cb
    }

    public removeWatcher(pathArr: ObjPath, mark?: any) {
        const pathStr = pathArr.join("/")
        if (ObsBase.observables.has(pathStr)) {
            if (mark && ObsBase.observables.get(pathStr).length > 1) {
                ObsBase.observables.set(pathStr, ObsBase.observables.get(pathStr).filter(cb => cb != mark))
            } else {
                ObsBase.observables.delete(pathStr)
            }
        }
    }

    public subscribe(pathArr: ObjPath, cb: ObsTarget,key?:string) {
        pathArr =key?[this.getName(),key, ...pathArr]:[this.getName(), ...pathArr]
        const pathStr = pathArr.join("/")
        if (!~ObsBase.subListPath.indexOf(pathStr)) {
            ObsBase.subListPath.push(pathStr)
        }
        return this.watcher(pathArr, cb)
    }

    public unsubscribe(pathArr: ObjPath, mark?: any) {
        this.removeWatcher([this.getName(), ...pathArr], mark)
    }

    protected processExtraProps(targetState: any, extra?: ExtraProps) {
        const { path, key, value } = extra
        let resState: any, ckey: PropertyKey
        resState = targetState
        //先找到数据
        if (path && path.length > 0) {
            path.forEach((skey) => {
                if (resState.hasOwnProperty(skey)) {
                    if (isPassType(resState[skey])) {
                        resState = resState[skey]
                        ckey = skey
                    } else {
                        resState = resState
                        ckey = skey
                    }
                }
            })
        } else if (targetState.hasOwnProperty(key)) {
            resState = targetState
            ckey = key
        }

        if (typeof value !== "undefined") { //添加逻辑
            Reflect.defineProperty(resState, ckey, {
                configurable: true,
                writable: true,
                enumerable: true,
                value
            })
            return targetState
        }
        return resState[ckey]

    }

    getAutoKey(): string {
        this._globalKey++
        return this._globalKey.toString()
    }

    getName() {
        return this.constructor.name;
    }

}