export interface StateHistory<T> {
    name:PropertyKey|string,
    key:string,
    beginState: T,
    endState: T
}
export type ObjPath = (string | number|PropertyKey)[]

export interface ExtraTags {
    name: string,
    //key: string,
    path: ObjPath
}

export interface ChangeContext{
    type:string,
    newValue:any,
    prevValue?:any,
    property:PropertyKey|string,
    name:string,
    path:ObjPath
}

export interface ExtraProps {
    key: string | number,
    value?: any,
    path: ObjPath
}
export type ObsTarget = (change:ChangeContext)=>void

export interface AreaObsTarget{
    areaId:string,
    callback:ObsTarget[]
}