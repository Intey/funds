export interface Entity {
    id: string
    remote: boolean
}

export interface Notification {
    type: string
    message: string
}


export interface Fund {
    name: string
    budget: number
    balance: number
    needSync: boolean
}

export interface Transfer {
    amount: number
    date: string
    description: string
    fromFund: string
    toFund: string
}

export interface Transaction {
    amount: number
    date: string
    description: string
    synced: boolean
    fromAccount: string
}

// type Dimension = "DIMENSION_UNSPECIFIED" | "ROWS" | "COLUMNS"

export interface ValuesRange {
    range: string,
    majorDimension: "ROWS",
    values: any[]
}


export type FundResponseData = [string, string, string, string, string, string, string]

export interface FundCellsResponse extends ValuesRange {
    values: FundResponseData[]
}
/**  amount, date, description, synced */
export type TransactionResponseData = [string, string, string, string];

export interface TransactionResponse extends ValuesRange {
    values: TransactionResponseData[]
}

// batch get of 2 different sheets: detail & transactions
export interface FundDetailCellsResponse extends Omit<ValuesRange, "values"> {
    valueRanges: [
        FundCellsResponse,
        TransactionResponse
    ]
}
export interface UpdateResponse {
    spreadsheetId: number
    tableRange: string
    updates: {
        updatedRange: string
        updatedRows: number
        updatedColumns: number
        updatedCells: number
    }
}

export type ExtendedValue =
    { numberValue: number }
    | { stringValue: string }
    | { boolValue: boolean }
    | { formulaValue: string }


export interface CellData {
    userEnteredValue: ExtendedValue
}

export interface RowData {
    values: CellData[]
}

export type UpdateCellsRequest = {
    updateCells: {
        rows: RowData,
        fields: string,
        area: {
            start:
            {
                sheetId: number,
                rowIndex: number,
                columnIndex: number
            }
        }
    }
}
export type AppendCellsRequest = {
    appendCells: {
        sheetId: number,
        rows: RowData,
        fields: string
    }
}
export type CreateSheetRequest = {
    addSheet: {
        properties: {
            title: string
        }
    }
}
export type BatchRequest = UpdateCellsRequest | AppendCellsRequest | CreateSheetRequest

export type BatchResponse = {
    replies: (BatchReply)[]
}
export type BatchReply = {} | AddSheetResponse

export type AddSheetResponse = {
    addSheet:
    {
        properties: {
            sheetId: number
            title: string
            index: number
        }
    }
}