import { google, sheets_v4 } from 'googleapis'

let cachedClient: sheets_v4.Sheets | null = null

function getEnv() {
  return {
    SHEET_ID: process.env.GOOGLE_SHEETS_ID!,
    SA_EMAIL: process.env.GOOGLE_SA_CLIENT_EMAIL!,
    SA_KEY: (process.env.GOOGLE_SA_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
  }
}

export function getSheetsClient(): sheets_v4.Sheets {
  if (cachedClient) return cachedClient
  const { SA_EMAIL, SA_KEY } = getEnv()

  const auth = new google.auth.JWT({
    email: SA_EMAIL,
    key: SA_KEY,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  })

  cachedClient = google.sheets({ version: 'v4', auth })
  return cachedClient
}

export function getSheetId(): string {
  return getEnv().SHEET_ID
}

export async function listSheetTabs(): Promise<{ title: string; sheetId: number }[]> {
  const sheets = getSheetsClient()
  const res = await sheets.spreadsheets.get({ spreadsheetId: getEnv().SHEET_ID })
  return (res.data.sheets || []).map(s => ({
    title: s.properties?.title || '',
    sheetId: s.properties?.sheetId || 0,
  }))
}

export async function getSheetValues(sheetTitle: string): Promise<string[][]> {
  const sheets = getSheetsClient()
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: getEnv().SHEET_ID,
    range: `'${sheetTitle}'`,
    valueRenderOption: 'FORMATTED_VALUE',
  })
  return (res.data.values as string[][]) || []
}

export async function updateCell(
  sheetTitle: string,
  cellA1: string,
  value: string
): Promise<void> {
  const sheets = getSheetsClient()
  await sheets.spreadsheets.values.update({
    spreadsheetId: getEnv().SHEET_ID,
    range: `'${sheetTitle}'!${cellA1}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [[value]] },
  })
}

export async function updateRange(
  sheetTitle: string,
  rangeA1: string,
  values: string[][]
): Promise<void> {
  const sheets = getSheetsClient()
  await sheets.spreadsheets.values.update({
    spreadsheetId: getEnv().SHEET_ID,
    range: `'${sheetTitle}'!${rangeA1}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values },
  })
}

// Converte índice 0-based de coluna pra letra A1 (0→A, 1→B, ..., 25→Z, 26→AA)
export function colIndexToLetter(idx: number): string {
  let s = ''
  let n = idx
  while (n >= 0) {
    s = String.fromCharCode((n % 26) + 65) + s
    n = Math.floor(n / 26) - 1
  }
  return s
}
