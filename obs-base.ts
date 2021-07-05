import { ObsTarget, ObjPath, ChangeContext, ExtraProps } from './utils/interfaces'
class ObsBase{
    public observables: Map<string, ObsTarget[]> = new Map();
    public changes: ChangeContext[] = []
    public subListPath:string[] = []
}

export default new ObsBase()