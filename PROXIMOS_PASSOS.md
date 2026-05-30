# Próximos Passos — Sync Bidirecional Planilha ↔ Web App

Última sessão: 2026-05-30. Stack pronta, falta finalizar configuração + teste end-to-end.

## Status atual ✅

- **DB Supabase resetado e populado**: 4095 medicamentos, 92 mochilas, 3564 lotes, 4095 sheet_mapping rows (1:1)
- **Google Service Account configurada**: `planilha-tais-sync@planilha-tais-cloud.iam.gserviceaccount.com` — compartilhada com planilha como Editor
- **`.env.local` OK**: todas 6 vars (GOOGLE_SHEETS_ID, GOOGLE_SA_CLIENT_EMAIL, GOOGLE_SA_PRIVATE_KEY, SYNC_WEBHOOK_SECRET=`TaisSyncSheet123456`, NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY)
- **Deploy Vercel production**: https://planilha-thais-syncapp.vercel.app
- **Apps Script bound à planilha**: handleEdit trigger configurado (handleEdit, Da planilha, Ao editar). URL + SECRET corretos
- **Migration v4 aplicada**: tabelas `sheet_mapping` + `sync_log` criadas e RLS desabilitado

## O que falta

### 1. Criar 3 Supabase Database Webhooks

Dashboard: https://supabase.com/dashboard/project/padlncqgvihwjoebzsrh/database/hooks

Cria 3 hooks (um por tabela), todos com config idêntica exceto Name + Table:

| Name | Table |
|------|-------|
| `sync_medicamentos` | medicamentos |
| `sync_lotes` | lotes |
| `sync_mochilas` | mochilas |

Pra cada hook:
- **Events:** Insert, Update, Delete (marca os 3)
- **Type:** HTTP Request
- **Method:** POST
- **URL:** `https://planilha-thais-syncapp.vercel.app/api/sync/from-db`
- **HTTP Headers:** adiciona 1:
  - Header name: `Authorization`
  - Header value: `Bearer TaisSyncSheet123456`
- **Timeout:** 5000

### 2. Testar end-to-end

**Sheets → Web:**
1. Abre planilha
2. Edita qtde de algum medicamento (ex: aba "aeromédico✈️", linha 4, coluna A)
3. Espera ~2s
4. Abre https://planilha-thais-syncapp.vercel.app no browser
5. Confirma que mudança apareceu

**Web → Sheets:**
1. Abre site
2. Edita qtde de algum item
3. Espera ~2s
4. Abre planilha
5. Confirma que célula correspondente atualizou

**Validar loop prevention (não deve loopar):**
```sql
-- No SQL Editor Supabase, ver últimas entradas
SELECT * FROM sync_log ORDER BY applied_at DESC LIMIT 20;
```
Deve alternar `source='web'` e `source='sheets'`, sem ficar em loop.

### 3. Criar `CLAUDE.md` do projeto

Documentar: arquitetura, env vars, endpoints sync, como rodar seed, troubleshooting (RLS, datas ambíguas). Pra futuras sessões Claude Code.

## Endpoints criados

- `GET /api/seed?reset=true` — reseta DB + reimporta tudo da planilha
- `POST /api/sync/from-sheets` — recebe edits do Apps Script (header Bearer)
- `POST /api/sync/from-db` — recebe edits do Supabase Webhook (header Bearer)

## Arquivos críticos

- `src/lib/google-sheets.ts` — cliente SA + helpers
- `src/lib/sheet-parser.ts` — parser 25 abas
- `src/lib/sync-log.ts` — loop prevention
- `src/lib/supabase.ts` — Proxy lazy (importante: lazy init evita travar build Vercel)
- `src/app/api/seed/route.ts` — UUID client-side pra match medicamento↔mapping
- `apps-script/onEdit.gs` — código do Apps Script (cola na planilha)
- `supabase_migration_v4.sql` — migration aplicada

## Decisões importantes

- **Premissa:** 1 user edita por vez (sem conflito simultâneo)
- **Loop prevention:** `sync_log` + janela 5s; source='sheets' suprime echo via webhook
- **Match item↔mapping:** UUID gerado client-side em seed (não dá pra usar nome+ordem — quebra com duplicatas)
- **Datas:** parser detecta MM/DD vs DD/MM, loga warning em ambíguo (não auto-corrige)
- **Build Vercel:** Proxy lazy em supabase.ts evita createClient em prerender (era a causa do "Invalid supabaseUrl")
