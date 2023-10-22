import { writable, type Writable, get } from 'svelte/store';
import { durableRequestBuilder, loadPersistent, savePersistent } from './utils';
import type { Entity } from './types';
import API from './api';


export function declarePersistStoreForArray<T>(name: string, defaultValue: T): Writable<T> {
    let { subscribe, update, set } = writable(loadPersistent(name, defaultValue));
    subscribe((value) => {
        //console.log("declareStore subscription: ", name);
        if (!(value instanceof Array)) {
            throw `Value in store "${name}" should be an array`;
        }
        savePersistent(name)(value);
    });

    return {
        subscribe,
        update,
        set
    };
}


export function declarePersistStore<T>(name: string, defaultValue: T): Writable<T> {
    let { subscribe, update, set } = writable(loadPersistent(name, defaultValue))
    subscribe((value) => {
        savePersistent(name)(value)
    })
    return {
        subscribe,
        update,
        set
    }
}



export function declareCRUD<T>(
    name: string,
    sheetName: string,
    valueToArray: (v: T) => string[],
    valueFromArray: (vals: string[]) => T & Entity,
    canRemote: () => boolean, api: API,
    notify: (message: string, type: string) => void,
    hooks: {
        onCreate?: (createdObject: T) => void,
        onRemove?: (removedObject: T) => void
    } = {}
) {
    let store = declarePersistStoreForArray<(T & Entity)[]>(name, [])
    let makeDurable = durableRequestBuilder(canRemote)
    let createFn = makeDurable(`${name}_create`, api.appendRow)
    let retrieveFn = makeDurable(`${name}_retrieve`, api.getRows)
    let updateFn = makeDurable(`${name}_update`, api.updateRow)
    let onCreateFn = async (obj: T) => null;
    let onRemoveFn = async (obj: T) => null;
    if (hooks.onCreate) {
        onCreateFn = makeDurable(`${name}_onCreateHook`, hooks.onCreate)
    }
    if (hooks.onRemove) {
        onRemoveFn = makeDurable(`${name}_onRemoveHook`, hooks.onRemove)
    }
    // let removeFn = makeDurable(`${name}_remove`, api.deleteRow)
    /*
    * create a new item. 
    * Steps:
    * 1. put in store (optimistic update)
    * 2. try network call with retry
    * 3. update id of created object in store
    */
    async function create(v: T) {
        let tmpId = Date.now()
        store.update(l => [...l, { ...v, id: tmpId, remote: false }])
        let result = await createFn(sheetName, valueToArray(v))
        if (result === null) {
            notify("Issue with network, will try again when become online", "system")
        } else {
            // update ID from remote and make it available for the hook
            let vals = get(store)
            for (let obj of vals) {
                if (obj.id == tmpId) {
                    obj.id = result
                    obj.remote = true
                    tmpId = result
                    break;
                }
            }
            store.set(vals)
            await onCreateFn({ ...v, id: tmpId, remote: true })
        }
    }
    /*
    * retrieve all items
    * Steps:
    * 1. try network call with delayed
    * 2. asap return the store
    * 3. on network finished - update store, UI will react by store change
    */
    async function retrieve() {
        console.log("retrieve")
        retrieveFn(`${sheetName}!A2:Z`).then(result => {
            if (result === null) {
                notify("Issue with network, will try again when become online", "system")
            } else {
                notify("Got that shit", "debug")
                store.set(result.map(valueFromArray))
            }
        })
    }
    async function update(id: string, v: T) {
        let result = await updateFn(sheetName, valueToArray(v), Number.parseInt(id))
        if (result === null) {
            notify("Issue with network, will try again when become online", "system")
        }
    }
    async function remove(id: string) {
    }

    return {
        create,
        update,
        remove,
        retrieve,
        store
    }

}