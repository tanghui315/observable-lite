import { ObsStore } from './obs-store'
import useConstant from 'use-constant';
import React, { useEffect, useState, ComponentType, FunctionComponent, useCallback, memo } from 'react';
import { ChangeContext } from './utils/interfaces';
import { isPassType } from './utils/index'
//const $gName = "__globalName"

function useForceUpdate() {
    const [, setTick] = useState(0)

    const update = useCallback(() => {
        setTick(tick => tick + 1)
    }, [])

    return update
}

export function useObservableStore<T>(
    initState: T,
    customKey?: string,
): any {
    if (typeof initState === "undefined") {
        throw new Error("no found state");
    }
    const store = ObsStore.getInstance()
    const KEY = useConstant(() => (customKey ? customKey : store.getAutoKey()));
    store.initState(store.getName(), KEY, initState)
    const [inState, setInState] = useState(store.getState(store.getName(),KEY));

    useEffect(() => {
        const mark = store.watcher([store.getName(), KEY], (change: ChangeContext) => {
            if (change.newValue !== change.prevValue) {
                setInState(store.getState(store.getName(), KEY))
            }
        })
        return function () {
            store.removeWatcher([store.getName(), KEY], mark)
        };
    }, []);

    return [inState, (state) => store.setStateObs(store.getName(), KEY, state), KEY];
}

export function connect(Component: ComponentType<any>, myObss?: typeof ObsStore): FunctionComponent {
    const store = myObss ? myObss.getInstance() : ObsStore.getInstance()
    const name = store.getName()
    const wrappedComponent = (props: any): JSX.Element => {

        const forceUpdate = useForceUpdate()
        useEffect(() => {
            const mark = store.watcher([name], (change: ChangeContext) => {
                if (change) {
                    forceUpdate()
                }
            })
            return function () {
                store.removeWatcher([name], mark)
            };
        }, []);

        return React.createElement(Component, { ...props });
    };
    return memo(wrappedComponent)
}