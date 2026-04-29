## Problema

A última rodada de hardening de segurança restringiu três tabelas e quebrou funcionalidades para usuários **não-admin**:

1. **`humans`** — `SELECT` agora limitado a self/admin → quebra:
   - Resolver `actor_id` próprio para criar comentários, projetos, audit logs (`useTaskComments`, `ProjetoDrawer`, `NovoProjetoDialog`, `ProjetoDetalhe`) — usuário comum não consegue ler **o próprio** registro porque o filtro é `auth_user_id = auth.uid()`, mas a policy também é `auth_user_id = auth.uid()`, então **isso continua funcionando**. O que quebra é resolver o `actor_id` de **outros** (`TaskMetadataSidebar` lê o autor de outra task).
2. **`profiles`** — `SELECT` limitado a self/admin → quebra:
   - `useUsuarios` (lista de usuários em /admin) → admin OK, não-admin não vê (intencional, mas a página é só admin então OK).
   - `useUnifiedAudit.resolveActorsByAuthUser` → não-admin não consegue resolver nomes de outros autores.
   - `TopBar` → cada usuário lê o próprio profile (`id = auth.uid()`) → **continua funcionando**.
3. **`colaboradores`** — `SELECT` limitado a admin/criador/email-match → quebra:
   - `Movimentacoes.tsx` linha 309 — dropdown "Folha de Pagamento" vazio para não-admin.
   - `MovimentacaoDetalhe.tsx` linha 238 — idem.
   - `ColaboradoresTab` (config financeiras) — admin OK.
   - JOIN `colaboradores(nome)` na linha 300 de Movimentacoes → silenciosamente retorna `null` para não-admin.

## Solução

Manter a postura de segurança (PII bloqueada) mas criar **funções SECURITY DEFINER** que expõem apenas campos seguros, e atualizar o app para usá-las.

### Migração SQL nova

1. **`get_colaboradores_minimal()`** — retorna `id, nome, cargo, ativo` (sem CPF/banco/salário). `SECURITY DEFINER`, grant para `authenticated`.
2. **`get_humans_minimal()`** — retorna `id, actor_id, auth_user_id, email` (sem CPF/phone/salário/contrato). `SECURITY DEFINER`, grant para `authenticated`. Permite resolver actor de qualquer usuário interno.
3. (Já existe) `get_profiles_public()` — usar para resolver autores em audit logs.

### Mudanças no código

| Arquivo | Mudança |
|---|---|
| `src/pages/Movimentacoes.tsx` | Trocar `from("colaboradores").select("*")` por `rpc("get_colaboradores_minimal")`. Remover JOIN `colaboradores(nome)` do select principal e fazer lookup local com o map já carregado. |
| `src/pages/MovimentacaoDetalhe.tsx` | Trocar `from("colaboradores").select("id, nome, cargo")` por `rpc("get_colaboradores_minimal")`. |
| `src/components/dev/TaskMetadataSidebar.tsx` | Trocar lookup de `humans` por `rpc("get_profiles_public")` filtrando pelo `task.created_by`. |
| `src/hooks/admin/useUnifiedAudit.ts` | Em `resolveActorsByAuthUser`, trocar `from("profiles")` por `rpc("get_profiles_public")` (filtrar in-memory pelos ids). |
| `src/hooks/useTaskComments.ts`, `ProjetoDrawer.tsx`, `NovoProjetoDialog.tsx`, `ProjetoDetalhe.tsx` | Mantêm `from("humans").select("actor_id").eq("auth_user_id", auth.uid())` — usuário lendo o próprio registro continua funcionando pela policy `humans_select_self_or_admin`. **Nenhuma mudança necessária.** |

### Notas de segurança preservadas

- PII real (`colaboradores.cpf`, `salario_base`, `banco`, `agencia`, `conta`, `chaves_pix`, endereço) continua **bloqueada** para não-admin/não-self via RLS. As novas funções retornam **só** `id/nome/cargo/ativo`.
- `humans` PII (cpf, phone, contratos, hourly_cost) continua bloqueada. Função minimal retorna só identificadores necessários para resolver actor.
- `profiles` PII (endereço, contato emergência, plano de saúde, etc.) continua bloqueada. Função pública retorna só identidade visual (nome, email, avatar).
- `integration_connections` continua restrita ao owner/admin — não há quebra de UI conhecida.

## Resumo

- 1 migração SQL criando 2 funções `SECURITY DEFINER`.
- 4 arquivos de frontend ajustados para usar RPCs em vez de SELECT direto.
- Zero relaxamento de RLS em tabelas com PII.
- Sistema 100% funcional para não-admins, com todos os campos sensíveis ainda protegidos.