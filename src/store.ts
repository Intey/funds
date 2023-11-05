import { get, writable, type Writable } from 'svelte/store';
import API, { fundToRequest, fundToRequestObject, transactionToRequest, transactionToRequestObject, transformFundFromResponse, transformTransactionFromResponse } from './api';
import type { AddSheetResponse, BatchReply, BatchRequest, BatchResponse, Entity, Fund, Notification, Transaction, TransactionResponseData } from './types';
import { loadPersistent, savePersistent } from './utils';
import { declareCRUD, declarePersistStore } from './storeTools';


export let notifications = writable<Record<number, Notification>>({});
function notify(message: string, type: string = "user", timeout: number = 5000) {
    let key = Date.now()
    notifications.update(ns => ({ ...ns, [key]: { type: type, message } }))
    setTimeout(() => {
        notifications.update(ns => {
            delete ns[key]
            return ns
        })
    }, timeout)
}

const SCOPES = 'https://www.googleapis.com/auth/spreadsheets';
const CLIENT_ID = "651542402284-hfl9taqbdq2lri9nuuig3lcircq4qh0d.apps.googleusercontent.com"
const API_KEY = 'AlIzaSyD2vT4nkavC_nE8YFWcPUGTCmtAzC9s2c4'
const CLIENT_SECRET = "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"
const REDIRECT_URL = 'http://localhost:3000'

export let api: API = new API("")

export let token = declarePersistStore<string>("token", tryLoadToken())
token.subscribe(t => {
    if (!api) { api = new API(t) }
    else {
        api.setToken(t)
    }
})

export let route = declarePersistStore<string>("route", "/")
//export let funds = declarePersistStore<Fund[]>("funds", [])

export let funds = declareCRUD(
    "funds",
    "Funds",
    511610517,
    fundToRequestObject,
    transformFundFromResponse,
    canRemote,
    api,
    notify,
    {
        onCreate: (fund: Fund) => ([
            {
                addSheet: {
                    properties: {
                        title: fund.name
                    }
                }
            }
        ]),
        onCreateResponceHandler: (replies: BatchReply[], store: Writable<(Fund & Entity)[]>) => {
            if (replies[1]) {
                // update ID from remote and make it available for the hook
                let sheetId = (replies[1] as AddSheetResponse).addSheet.properties.sheetId + ""

                let vals = get(store)
                let obj = vals.find(e => e.id == sheetId);
                if (obj) {
                    obj.id = sheetId
                    obj.remote = true
                }
                store.set(vals)
            }
            else {
                notify("Issue with network, will try again when become online", "system")
            }

        }
    })


export async function auth(): Promise<string> {
    return new Promise((resolve, reject) => {
        let tokenValue = tryLoadToken()
        if (tokenValue) {
            resolve(tokenValue)
            return;
        }
        // @ts-ignore
        let client = google.accounts.oauth2.initTokenClient({
            client_id: CLIENT_ID,
            scope: SCOPES,
            // @ts-ignore
            callback: (resp) => {
                if (resp.error !== undefined) {
                    console.log("callback error in authApi:", resp)
                    reject({ error: resp });
                    return
                }
                savePersistent("expires")(String(Date.now() + parseInt(resp.expires_in) * 1000))
                token.set(resp.access_token)
                resolve(resp.access_token)
            }
        })
        client.requestAccessToken({ prompt: "consent" })
    })
}


function tryLoadToken() {
    const tokenValue = loadPersistent("token", "")
    const expiresRaw = loadPersistent("expires", "")
    const expires = parseInt(expiresRaw || `${Date.now()}`)
    if (tokenValue && expires >= Date.now()) {
        return tokenValue;
    }
    window.localStorage.removeItem("token")
    window.localStorage.removeItem("expires")
    return "";
}


export function canRemote(): boolean {
    return navigator.onLine && !!get(token)
}


export function getTransactionsStore(fundName: string) {
    let fundIdString = get(funds.store).find(f => f.name === fundName)?.id
    let fundId: number
    if (fundIdString === undefined) {
        console.log("Can't get transactions for fund: " + fundName + ". Check that ID that fund sheet is created and it's ID set to the fund object")
        fundId = NaN
    }
    else {
        fundId = Number.parseInt(fundIdString)
        if (Number.isNaN(fundId)) {
            throw new Error("Can't get transactions for fund: " + fundName + " with ID: " + fundIdString + ". Check that ID that fund sheet is created and it's ID set to the fund object")
        }
    }

    let key = `${fundName}_transactions`;
    let transactions = declareCRUD(
        key,
        fundName,
        fundId,
        transactionToRequestObject,
        transformTransactionFromResponse,
        canRemote,
        api,
        notify)
    return transactions
}