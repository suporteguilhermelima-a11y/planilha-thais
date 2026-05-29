/**
 * Apps Script bound à planilha de medicamentos
 * Cola este código em: Planilha > Extensões > Apps Script
 *
 * Configurar:
 *  - Substituir ENDPOINT pela URL real do deploy (Vercel)
 *  - Substituir SECRET pelo mesmo valor de SYNC_WEBHOOK_SECRET no .env.local
 *
 * Trigger: simple onEdit dispara automaticamente em qualquer edição.
 * Se UrlFetchApp falhar em simple trigger (limitação Google),
 * trocar pra installable trigger via: Triggers > Adicionar trigger > handleEdit > onEdit (do planilha)
 */

const ENDPOINT = 'https://SEU-DEPLOY.vercel.app/api/sync/from-sheets';
const SECRET = 'COLAR_SYNC_WEBHOOK_SECRET_AQUI';

function onEdit(e) {
  handleEdit(e);
}

function handleEdit(e) {
  try {
    if (!e || !e.range) return;
    const range = e.range;
    const sheet = range.getSheet();
    const row = range.getRow();
    const col = range.getColumn();
    const lastCol = sheet.getLastColumn();
    const allRow = sheet.getRange(row, 1, 1, lastCol).getValues()[0];

    const payload = {
      sheet: sheet.getName(),
      row: row,
      col: col,
      value: e.value !== undefined ? String(e.value) : '',
      all_row: allRow.map(v => v === null || v === undefined ? '' : String(v)),
    };

    UrlFetchApp.fetch(ENDPOINT, {
      method: 'post',
      contentType: 'application/json',
      headers: { Authorization: 'Bearer ' + SECRET },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true,
    });
  } catch (err) {
    console.error('onEdit sync failed:', err);
  }
}
