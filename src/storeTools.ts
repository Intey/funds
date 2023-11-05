import { writable, type Writable, get } from 'svelte/store';
import { durableRequestBuilder, loadPersistent, savePersistent } from './utils';
import type { BatchReply, BatchRequest, BatchResponse, Entity, RowData } from './types';
import API from './api';


export interface CRUDStore<T> {
    create: (v: T) => Promise<void>,
    update: (id: string, v: T) => Promise<void>,
    remove: (id: string) => Promise<void>,
    retrieve: () => Promise<void>,
    store: Writable<(T & Entity)[]>

}


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
    sheetId: number,
    valueToRequestPayload: (v: T) => { rows: RowData },
    valueFromArray: (vals: string[]) => T & Entity,
    canRemote: () => boolean, api: API,
    notify: (message: string, type: string) => void,
    hooks: {
        onCreate?: (createdObject: T) => BatchRequest[],
        onRemove?: (removedObject: T) => BatchRequest[],
        onCreateResponceHandler?: (replies: BatchReply[], store: Writable<(T & Entity)[]>) => void
    } = {}
): CRUDStore<T> {
    let store = declarePersistStoreForArray<(T & Entity)[]>(name, [])
    let makeDurable = durableRequestBuilder(canRemote)
    // let createFn = makeDurable(`${name}_create`, api.appendRow)
    let retrieveFn = makeDurable(`${name}_retrieve`, api.getRows)
    let updateFn = makeDurable(`${name}_update`, api.batchUpdate)
    let createFn = makeDurable(`${name}_create`, api.batchUpdate)

    // let removeFn = makeDurable(`${name}_remove`, api.deleteRow)
    /*
    * create a new item. 
    * Steps:
    * 1. put in store (optimistic update)
    * 2. try network call with retry
    * 3. update id of created object in store
    */
    async function create(v: T) {
        let tmpId = "" + Date.now()
        store.update(l => [...l, { ...v, id: tmpId, remote: false }])
        let requests: BatchRequest[] = [{
            appendCells: {
                sheetId,
                // the data
                ...valueToRequestPayload(v),
                fields: "*" // response filter of output fields? 
            }
        }]
        if (hooks.onCreate) {
            requests = [...requests, ...hooks.onCreate(v)]
        }

        let result = await createFn(requests)
        if (hooks.onCreateResponceHandler && result !== null) {
            hooks.onCreateResponceHandler(result.replies.splice(1), store)
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

        let requests: BatchRequest[] = [{
            updateCells: {
                // the data
                ...valueToRequestPayload(v),
                fields: "*", // response filter of output fields? 
                area: {
                    start:
                    {
                        sheetId, // TODO: get sheet id from create function
                        rowIndex: Number.parseInt(id),
                        columnIndex: 0
                    }
                }
            }
        }]
        let result = await updateFn(requests)
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