# Auditoria intuitiva para leigos

Resolver os 3 problemas reportados:
1. **"Sistema" aparecendo** — porque o trigger `crm_audit_trigger` tenta resolver o autor pelos campos `updated_by`/`created_by` da row, que o app não preenche. 47 de 259 logs estão sem ator.
2. **"Alterou 2 campos: New Data, Old Data"** — meu formatter listou as chaves do JSON `{new_data, old_data}` como se fossem nomes de campos. É um bug: preciso fazer o **diff entre as duas rows** pra saber o que mudou de verdade.
3. **Cores sem legenda** e visual sem hierarquia — bullets coloridos sem nada explicando, módulo perdido no meio do texto cinza.

## O que vai mudar

### 1. Trigger do banco (migration)
Atualizar `crm_audit_trigger()` pra resolver `auth.uid()` automaticamente quando `updated_by` for null:

```sql
-- Fallback chain: updated_by → created_by → auth.uid()→humans → owner_actor_id
IF v_actor IS NULL THEN
  v_uid := auth.uid();
  IF v_uid IS NOT NULL THEN
    SELECT actor_id INTO v_actor FROM public.humans WHERE auth_user_id = v_uid;
  END IF;
END IF;
```

Também guardar `auth_uid` no `metadata`, e fazer **backfill** dos 47 registros antigos quando possível. Resultado: a partir de agora, **toda ação humana mostra a pessoa real**. Só ficam como "Automático" eventos realmente automáticos (edge function sem contexto auth, gatilhos em cascata).

### 2. Diff correto e em linguagem natural

Nova função `diffChanges()` em `formatters.ts` que:
- Detecta o formato `{new_data, old_data}` e calcula o diff campo-a-campo
- Ignora ruído (`id`, `organization_id`, `updated_at`, `stage_changed_at`, `code`, `created_at`)
- Traduz **valores enum** pra texto humano: `presencial_agendada` → "Reunião agendada", `fechado_ganho` → "Fechado ganho", `software_sob_medida` → "Software sob medida"
- Formata números: `60000` em campo `*value*` → "R$ 60.000,00"; `80` em `probability_pct` → "80%"
- Datas ISO → `dd/mm/aaaa`
- UUIDs → "(referência)" (resolvidos pelo nome quando possível em V2)

Resultado das frases:
- ❌ Antes: *"Alterou 2 campos: New Data, Old Data"*
- ✅ Depois: *"Mudou Probabilidade de 50% para 80%"*
- ✅ Múltiplos: *"Alterou Probabilidade, Próximo passo e Estágio"*
- ✅ Muitos: *"Atualizou 7 campos"* (clique pra ver tudo)

### 3. Novo visual da lista (claro pra leigo)

```text
┌────────────────────────────────────────────────────────────────┐
│ Auditoria                                       [⤓ Exportar]   │
│ Histórico de tudo que aconteceu no sistema.                    │
│                                                                │
│ Legenda:                                                       │
│ 🟢 Criação · 🟡 Alteração · 🔵 Mudança de status               │
│ 🔴 Exclusão · 🟣 Acesso ao sistema                             │
├────────────────────────────────────────────────────────────────┤
│ [filtros…]                                                     │
├────────────────────────────────────────────────────────────────┤
│ HOJE                                                           │
│                                                                │
│ ●  20:15  [👤 D]  Daniel Rocha  alterou um deal                │
│           [CRM]  Deal · DEAL-008 · Sunbright Engenharia        │
│           ▸ Mudou Probabilidade de 50% para 80%                │
│                                                                │
│ ●  19:54  [🤖]    Automático (gatilho do sistema)              │
│           [CRM]  Deal · DEAL-008 · Sunbright Engenharia        │
│           ▸ Mudou Estágio: Em negociação → Fechado ganho       │
│                                                                │
│ ●  19:35  [👤 D]  Daniel Rocha  entrou no sistema              │
│           [Admin]  Autenticação                                │
│           ▸ Login com daniel@getbrain.com.br                   │
└────────────────────────────────────────────────────────────────┘
```

**Diferenças vs hoje:**
- **Nome em destaque** (peso 600, cor foreground) + frase de ação ("alterou um deal", "criou uma movimentação", "entrou no sistema")
- **Badge colorido por módulo** com cor própria: CRM ciano · Projetos roxo · Financeiro verde · Admin rosa · Outros cinza — bate o olho e sabe o setor
- **Linha do "o quê"** com `▸` e em texto destacado, separada da linha de contexto
- **Quando o ator é null mas é claramente automático**, mostra **"Automático (gatilho do sistema)"** com ícone de robô — explica que NÃO foi pessoa, ao invés de só "Sistema"
- **Avatar com inicial colorida** pelo módulo (não só cinza)
- **Legenda de cores** sempre visível abaixo do título da página

### 4. Drawer de detalhe melhorado

```text
DEAL-008 · Sunbright Engenharia                           [×]
─────────────────────────────────────────────────────────────
[CRM] Deal · Alteração

Quem fez:    👤 Daniel Rocha (daniel@getbrain.com.br)
Quando:      28 abr 2026 às 20:15 (há 3 minutos)
Origem:      Edição manual no CRM

CAMPOS ALTERADOS
┌─ Probabilidade ─────────────────────────┐
│ 50%  →  80%                             │
└─────────────────────────────────────────┘
┌─ Próximo passo ─────────────────────────┐
│ (vazio)  →  Enviar proposta revisada    │
└─────────────────────────────────────────┘

[Abrir DEAL-008 ↗]   [Ver dados técnicos]
```

- Adiciona linha **"Origem"** explicando se foi *Edição manual no CRM* (`source: crm_audit_trigger` + auth_uid presente), *Conversão automática de lead* (`source: lead_conversion`), *Ação administrativa* (`system_audit_logs`), etc.
- Adiciona **"há X minutos"** para contexto temporal rápido
- "Ver JSON" virou "Ver dados técnicos" (linguagem leiga)

### 5. Logins repetidos colapsam

Múltiplos logins consecutivos do mesmo usuário viram **uma linha**:
> "Daniel Rocha entrou no sistema **3 vezes** entre 19:35 e 20:32"

(clica pra expandir cada um)

### 6. Filtros mais explicativos

Trocar labels:
- "Módulo" → **"Setor do sistema"**
- "Ação" → **"Tipo de ação"**
- "Período" → mantém

## Arquivos a alterar

| Arquivo | O quê |
|---|---|
| **migration nova** | Atualizar `crm_audit_trigger` (auth.uid() fallback + auth_uid no metadata) + backfill |
| `src/lib/audit/formatters.ts` | Nova `diffChanges()`, dicionário `ENUM_LABELS`, `MODULE_BADGE` por cor, `formatValue` com moeda/% |
| `src/components/admin/auditoria/AuditFeedItem.tsx` | Novo layout: nome em destaque + frase de ação + badge módulo colorido + linha do diff |
| `src/components/admin/auditoria/AuditDetailDrawer.tsx` | Linha "Quem/Quando/Origem", "há X min", botão renomeado |
| `src/hooks/admin/useUnifiedAudit.ts` | Detectar ator ausente + `metadata.source` para classificar como "Automático" vs humano. Agrupar logins consecutivos. |
| `src/pages/admin/AdminAuditoriaPage.tsx` | Adicionar legenda de cores no topo, filtros relabelados |

## Fora do escopo (V2 se quiser)

- Resolver UUIDs nos diffs pelo nome real (ex: `owner_actor_id: actor-uuid → actor-uuid` virar "João Silva → Maria Santos") — exige uma 2ª query bulk de actors.
- Realtime live append.
- Filtro "Apenas ações automáticas" / "Apenas humanas".
