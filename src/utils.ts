export function handler(f: () => void) {
    return (ev: Event) => {
        ev.preventDefault();
        ev.stopPropagation();
        f();
    };
}

export function loadPersistent<T>(key: string, defaultValue: T): T {

    let gotData = localStorage.getItem(key)
    if (!gotData) {
        return defaultValue
    }
    try {
        let value = JSON.parse(gotData)
        //console.log('load persistent', key, value)
        return value
    } catch (_) {
        return defaultValue
    }

}

export const savePersistent = (key: string) => (value: any) => {
    if (!value || value === "") {
        console.error("Tried to save falsy value ", value, " under: ", key)
        return
    }
    localStorage.setItem(key, JSON.stringify(value))
    // console.log('save persistent', key, value)
}


interface IndexedDB<T> {
    saveData: (data: T) => Promise<void>;
    updateData: (data: T) => Promise<void>;
    getData: (id: string) => Promise<T | undefined>;
    deleteData: (id: string) => Promise<void>;
    getListData: () => Promise<T[]>;
}

export async function createIndexedDB<T>(storeName: string): Promise<IndexedDB<T>> {
    return new Promise((resolve, reject) => {
        // Open the IndexedDB database
        const openDBRequest = window.indexedDB.open('myApp', 4);

        openDBRequest.onerror = (event) => {
            reject(event);
        };
        openDBRequest.onsuccess = (event) => {
            const db = openDBRequest.result;
            // @ts-ignore
            const transaction = db.transaction(storeName, IDBTransaction.READWRITE);
            const objectStore = transaction.objectStore(storeName);

            // Save data to IndexedDB
            function saveData<T>(data: T): Promise<void> {
                return new Promise((resolve, reject) => {
                    const request = objectStore.add(data);
                    request.onsuccess = () => resolve();
                    request.onerror = () => reject(request.error);
                });
            }

            // Update data in IndexedDB
            function updateData<T>(data: T): Promise<void> {
                return new Promise((resolve, reject) => {
                    const request = objectStore.put(data);
                    request.onsuccess = () => resolve();
                    request.onerror = () => reject(request.error);
                });
            }

            // Retrieve data from IndexedDB
            function getData<T>(id: string): Promise<T | undefined> {
                return new Promise((resolve, reject) => {
                    const request = objectStore.get(id);
                    request.onsuccess = () => {
                        const data = request.result;
                        resolve(data ? data : undefined);
                    };
                    request.onerror = () => reject(request.error);
                });
            }
            function getListData<T>(): Promise<T[]> {
                return new Promise((resolve, reject) => {
                    const request = objectStore.getAll();
                    request.onsuccess = () => {
                        const data = request.result;
                        resolve(data ? data : []);
                    };
                    request.onerror = () => reject(request.error);
                });
            }


            // Delete data from IndexedDB
            function deleteData(id: string): Promise<void> {
                return new Promise((resolve, reject) => {
                    const transaction = db.transaction(storeName, 'readwrite');
                    const objectStore = transaction.objectStore(storeName);
                    const request = objectStore.delete(id);
                    request.onsuccess = () => resolve();
                    request.onerror = () => reject(request.error);
                });
            }

            resolve({
                saveData,
                updateData,
                getData,
                deleteData,
                getListData,
            })
        }
    })
}


// Utility helper to get the type out of a Promise 
type ReturnPromiseType<T extends (...args: any) => Promise<any>> = T extends (...args: any) => Promise<infer R> ? R : any;

type AnyFunction = (...args: any[]) => any
export function durableRequestBuilder(
    remoteCheck: () => boolean,
) {
    return <F extends AnyFunction>(name: string, callback: F) => {
        return async (...args: Parameters<F>): Promise<ReturnPromiseType<F> | null> => {
            if (remoteCheck()) {
                return await callback(...args)
            } else {
                // let requestsKey = `${name}`
                // let existRequests = loadPersistent("requests", [])
                // let retry = async () => {
                //     if (remoteCheck()) {
                //         await callback(...args)
                //         // TODO : delete this request from store
                //     } else {
                //         return
                //     }
                // }
                // savePersistent("requests")([...existRequests, { type: name, retry }])
                // the part of subscibe of network state change is in main script or something like it. maybe in App
                console.warn("Durable is not durable. Unimplemented retry.")
                return null
            }
        }
    }
}