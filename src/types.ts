export interface Entity {
    id: number | string
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

export interface Transaction{
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