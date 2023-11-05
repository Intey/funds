import axios, { AxiosError } from 'axios';
import type { AddSheetResponse, BatchRequest, BatchResponse, Entity, Fund, RowData, Transaction, UpdateResponse, ValuesRange } from './types';

const SHEET_ID = "16Q3kcikjtI2YiN-JwpZoRoHPxPuoOgaiCppt0ZcwgiQ";
type ReturnPromiseType<T extends (...args: any) => Promise<any>> = T extends (...args: any) => Promise<infer R> ? R : any;

type AnyFunction = (...args: any[]) => any

function withDebounce<F extends AnyFunction>(f: AnyFunction) {
  let debuonced = false
  return async (...args: Parameters<F>): Promise<ReturnPromiseType<F> | undefined> => {
    if (!debuonced) {
      console.log("run request:", name, f, args)
      debuonced = true
      setTimeout(() => { debuonced = false }, 300)
      return f(args)
    } else {
      console.log("debounce request", name)
    }
  }

}

export default class GoogleSpreadsheetAPI {

  private spreadsheetId: string;
  private token: string

  constructor(token: string) {
    this.spreadsheetId = SHEET_ID;
    this.token = token
  }
  private basicFetch = async (method: string, url: string, body: any = null, params: any = {}): Promise<any> => {
    try {
      const response: { status: number, data: any } = await axios({
        url,
        method: method,
        data: body,
        params: params,
        headers: {
          Authorization: `Bearer ${this.token}`,
          'Content-Type': 'application/json'
        }
      });
      if (response.status >= 400) {
        // @ts-ignore
        throw new AxiosError('Failed to fetch data.', undefined, undefined, null, response);
      }
      return response.data;

    } catch (error) {
      let err = error as AxiosError;
      let content: object | string = ""
      if (err.response?.status == 400) {
        // @ts-ignore
        content = err.response.data.error.message
      }
      else {
        content = err.response ? (err.response.data ? err.response.data : err.response) : err
        console.error('Error basic fetch:', content);
      }
      throw content;
    }
  }


  setToken = (t: string) => {
    this.token = t;
  }


  appendRow = async (sheetId: number, rowValues: RowData): Promise<number> => {
    try {
      const response = await this.batchUpdate(
        [{
          appendCells: {
            sheetId: sheetId,
            rows: rowValues,
            fields: "*"
          }
        }]
      );
      if (!response) {
        return -1
      }
      //let range = response.updates.updatedRange as string;
      // get row number of appenden row
      return 100500//Number.parseInt(range.split("!")[1].split(":")[0].substring(1))

    } catch (error) {
      console.error('Error appending row:', error);
      throw error;
    }
  }


  appendRows = async (sheetName: string, rowValues: any[][]): Promise<number> => {
    try {
      const response: UpdateResponse = await this.basicFetch(
        "POST",
        `https://sheets.googleapis.com/v4/spreadsheets/${this.spreadsheetId}/values/${sheetName}!A:A:append`,
        {
          values: rowValues
        },
        {
          valueInputOption: 'USER_ENTERED',
          insertDataOption: 'INSERT_ROWS',
          includeValuesInResponse: false
        }
      );

      let range = response.updates.updatedRange as string;
      return Number.parseInt(range.split("!")[1].split(":")[0].substring(1))

    } catch (error) {
      console.error('Error appending row:', error);
      throw error;
    }
  }


  updateRow = async (sheetName: string, rowValues: any[], rowIndex: number): Promise<number> => {
    try {
      const response: UpdateResponse = await this.basicFetch(
        "PUT",
        `https://sheets.googleapis.com/v4/spreadsheets/${this.spreadsheetId}/values/${sheetName}!A${rowIndex}:C${rowIndex}`,
        {
          values: [rowValues]
        },
        {
          valueInputOption: 'USER_ENTERED'
        }
      );

      let range = response.updates.updatedRange as string;
      return Number.parseInt(range.split("!")[1].split(":")[0].substring(1))
    } catch (error) {
      console.error('Error updating row:', error);
      throw error;
    }
  }


  getRows = async (ref: string): Promise<string[][]> => {
    try {
      console.log("getRows")
      const response: ValuesRange = await this.basicFetch(
        "GET",
        `https://sheets.googleapis.com/v4/spreadsheets/${this.spreadsheetId}/values/${ref}`
      );

      return response.values;
    } catch (error: any) {
      console.error('Error getting row:', error);
      throw error;
    }
  }
  createSheet = async (name: string): Promise<AddSheetResponse> => {
    let response = await this.batchUpdate([
      {
        addSheet: {
          properties: {
            title: name
          }
        }
      }
    ])
    return response.replies[0] as AddSheetResponse
  }

  batchUpdate = async (requests: BatchRequest[]): Promise<BatchResponse> => {
    try {
      const response: BatchResponse = await this.basicFetch(
        "POST",
        `https://sheets.googleapis.com/v4/spreadsheets/${this.spreadsheetId}:batchUpdate`,
        {
          requests: requests,
          includeSpreadsheetInResponse: false,
        }
      );

      return response;
    } catch (error: any) {
      console.error('Error getting row:', error.response?.data);
      throw error.response?.data;
    }

  }
}


//TODO: use https://github.com/Hookyns/tst-reflect for reflection and auto generation of those functions


export function transformFundFromResponse(
  vals: string[]
  // [name, budget, balance, needSync]: FundResponseData
): (Fund & Entity) {
  let [name, budget, balance, needSync] = vals
  let result = {
    name,
    balance: Number.parseFloat(balance),
    budget: Number.parseFloat(budget),
    needSync: needSync == "TRUE",
    id: "transformTransactionFromResponse TODO",
    remote: true
  };

  return result;
}


//TODO: use https://github.com/Hookyns/tst-reflect for reflection and auto generation of those functions

export function transformTransactionFromResponse(vals: string[]): (Transaction & Entity) {
  let [amount, date, description, synced] = vals
  // TODO: GET ID 
  return {
    amount: Number.parseFloat(amount)
    , date
    , description
    , synced: synced == "TRUE"
    , fromAccount: ""
    , id: "transformTransactionFromResponse TODO"
    , remote: true
  }
}

export function fundToRequest(fund: Fund) {
  return [fund.name, String(fund.budget), `=B4-SUM(INDIRECT("$A4")&"!$A$2:$A")`, '=NOT(XLOOKUP(FALSE;INDIRECT($A4&"!$D:$D");INDIRECT($A4&"!$D:$D");TRUE))']
}

export function fundToRequestObject(fund: Fund): { rows: RowData } {
  return {
    rows:
    {
      values: [
        { userEnteredValue: { stringValue: fund.name } },
        { userEnteredValue: { numberValue: fund.budget } },
        { userEnteredValue: { formulaValue: `=B4-SUM(INDIRECT("$A4")&"!$A$2:$A")` } },
        { userEnteredValue: { formulaValue: '=NOT(XLOOKUP(FALSE;INDIRECT($A4&"!$D:$D");INDIRECT($A4&"!$D:$D");TRUE))' } },
      ]
    }
  }
}

export function transactionToRequest(transaction: Transaction) {
  return [String(transaction.amount), transaction.date, transaction.description, transaction.synced ? "TRUE" : "FALSE"]
}

export function transactionToRequestObject(transaction: Transaction): { rows: RowData } {
  return {
    rows: {
      values: [
        { userEnteredValue: { numberValue: transaction.amount } },
        { userEnteredValue: { stringValue: transaction.date } },
        { userEnteredValue: { stringValue: transaction.description } },
        { userEnteredValue: { boolValue: transaction.synced } },
      ]
    }
  }
}