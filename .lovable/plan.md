## Header de identidade da empresa no topo da sub-aba "Cliente"

Hoje a sub-aba **Cliente** (dentro de Descoberta, em `/crm/d/:code`) começa direto em "Setor da empresa". Vou adicionar no topo um bloco de identidade com **logo da empresa** (com upload) e **nome** (razão social + nome fantasia editáveis), antes dos demais campos.

### Comportamento

- **Logo (esquerda)**: thumbnail 80×80 quadrado arredondado. Se não tem logo, mostra placeholder com ícone `Building2` e iniciais da empresa. Botão "Enviar logo" / "Trocar logo" abaixo (variant outline, sm). Aceita PNG/JPG/SVG/WEBP, máx 2MB. Upload vai pro bucket `company-logos` (novo, público) no path `{company_id}/logo-{timestamp}.{ext}`.
- **Nome (direita, ocupa o resto)**:
  - Linha 1: **Razão social** (`legal_name`) — input grande, fonte semibold, autosave on blur (campo obrigatório, não permite vazio).
  - Linha 2: **Nome fantasia** (`trade_name`) — input menor, placeholder "Nome fantasia (opcional)", autosave on blur, pode ficar vazio.
  - Linha 3 (read-only): badge com CNPJ formatado se existir, senão link "+ adicionar CNPJ" que foca no campo (mantém simples por ora — CNPJ continua editável só na ficha da empresa, fora do escopo).
- Bloco fica **acima** do grid Setor/Faturamento, separado por `border-b border-border/60 pb-4 mb-4` (mesmo padrão do header da seção).
- Reusa `useUpdateCompanyField` que já está no `ZoneCliente` para salvar `legal_name`, `trade_name` e `logo_url`.
- Toast de sucesso/erro via `sonner` (padrão do projeto).

### Backend

Adicionar coluna `logo_url text` em `public.companies` (nullable) e criar bucket público `company-logos` com policies:
- SELECT público (bucket é público).
- INSERT/UPDATE/DELETE: usuários autenticados da org (segue padrão do bucket `avatars`).

### Arquivos afetados

- **Migração SQL**: adicionar `logo_url` em `companies` + criar bucket `company-logos` + policies.
- `src/components/crm/ZoneCliente.tsx`: adicionar componente interno `CompanyIdentityHeader` no topo do `<section>`, com logo uploader + inputs de nome. Reusa lógica de upload do `LogoUploader` de orçamentos como referência (não importa direto — escopo diferente).
- `src/hooks/crm/useCrmDetails.ts`: nada a mudar (já tem `useUpdateCompanyField` genérico). Só confirmar que o tipo `Company` aceita `logo_url` (vem do `types.ts` regenerado).

Sem mudanças em outros componentes, RLS de companies, ou no `CrmDealDetail.tsx`. O ✅ verde da sub-aba "Cliente" continua dependendo de `sector_id + client_type + contact_person_id` (logo é opcional).

### Esboço visual

```text
┌──────────────────────────────────────────────────────┐
│  01  Cliente & Empresa   Quem é, em que mercado...  │
├──────────────────────────────────────────────────────┤
│  ┌────┐  Razão Social Ltda                ___________│
│  │LOGO│  Nome Fantasia                    ___________│
│  └────┘  [CNPJ 12.345.678/0001-90]                  │
│  [Trocar logo]                                       │
├──────────────────────────────────────────────────────┤
│  Setor da empresa        │  Faixa de faturamento     │
│  ...                                                 │
```
