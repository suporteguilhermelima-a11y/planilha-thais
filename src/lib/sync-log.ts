import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export type SyncSource = 'web' | 'sheets'

// Registra origem de uma escrita. Webhook compara antes de fazer echo.
export async function recordSync(
  tableName: string,
  recordId: string,
  source: SyncSource
): Promise<void> {
  await supabase.from('sync_log').insert({
    table_name: tableName,
    record_id: recordId,
    source,
  })
}

// Verifica se record foi escrito a partir de `source` recentemente (janela em ms).
// Usado pra suprimir echo: se DB recebeu update de sheets, não re-empurra pro sheets.
export async function wasRecentlyFromSource(
  tableName: string,
  recordId: string,
  source: SyncSource,
  windowMs = 5000
): Promise<boolean> {
  const since = new Date(Date.now() - windowMs).toISOString()

  const { data } = await supabase
    .from('sync_log')
    .select('source, applied_at')
    .eq('table_name', tableName)
    .eq('record_id', recordId)
    .gte('applied_at', since)
    .order('applied_at', { ascending: false })
    .limit(1)

  return Boolean(data?.[0] && data[0].source === source)
}
