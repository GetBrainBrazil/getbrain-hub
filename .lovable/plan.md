## Objetivo

Quando o cliente digita a senha da proposta uma vez, ele não precisa digitar de novo por **12 horas**, mesmo se atualizar a página, fechar e reabrir a aba ou voltar via histórico — desde que continue no mesmo navegador/dispositivo.

## Como vai funcionar (visão do cliente)

1. Cliente abre o link da proposta → digita a senha.
2. A página guarda um "passe" seguro no próprio navegador, válido por 12 horas.
3. Nas próximas 12 h, ao reabrir o link, a proposta aparece direto, sem tela de senha.
4. Após 12 h (ou se a proposta expirar / for desativada / a senha mudar), volta a pedir a senha.
5. Se o passe for inválido ou rejeitado pelo servidor, a tela de senha aparece sem mensagem de erro (transparente).

## Mudanças técnicas

### 1. Edge function `verify-proposal-access`
- Aumentar `JWT_TTL_SECONDS` de `15 * 60` (15 min) para `12 * 60 * 60` (12 h).
- Continuar incluindo `proposal_id` + `exp` no payload (sem outras mudanças de claim).
- Manter rate limit e auditoria como estão.

### 2. Edge function nova / leve: aproveitar `get-proposal-public-data`
- Não precisa de função nova. Já valida o JWT internamente. Vamos usar a própria chamada de "carregar dados" como verificação de passe.

### 3. `src/pages/public/PropostaPublica.tsx`
- Criar helpers locais `loadStoredAccess(token)` / `saveStoredAccess(token, jwt, expSeconds)` / `clearStoredAccess(token)` usando `localStorage` com chave por token: `proposal_access:<token>`.
  - Valor armazenado: `{ jwt, expiresAt }` (epoch ms).
  - Antes de usar, comparar `expiresAt > Date.now()`; senão limpar.
- Novo `useEffect` no mount (quando não é preview e há `token`):
  1. Ler passe salvo. Se válido, setar `accessJwt` e chamar `get-proposal-public-data` com ele.
  2. Se a chamada retornar 401/403 ou falhar, limpar o passe e cair na tela de senha sem mostrar erro.
  3. Se retornar OK, popular `proposal` + `pageSettings` direto, pulando a senha.
- Em `handleLogin`, após receber `access_jwt` com sucesso, salvar via `saveStoredAccess(token, jwt, data.expires_in)`.
- Em `handleDownloadPdf`, quando o servidor responder `unauthorized`, além de zerar o estado, chamar `clearStoredAccess(token)` para forçar nova senha.
- Adicionar pequeno spinner de "Carregando proposta…" enquanto a restauração inicial roda, para o cliente não ver flash da tela de senha.

### 4. Comportamento em preview
- Preview interno (`?preview=...`) continua funcionando como hoje, sem tocar no `localStorage` (já é fluxo separado do JWT do cliente).

### 5. Segurança
- O JWT é específico da proposta (claim `proposal_id`) e é validado server-side em todas as chamadas → mesmo que copiado, só serve para aquela proposta e expira em 12 h.
- Trocar a senha da proposta no editor invalida automaticamente os passes antigos (servidor recusa o JWT antigo? Não diretamente — ele só checa assinatura/exp). Para forçar invalidação ao trocar a senha, a edge function que regenera senha já zera o `access_token`? Conferir; se não, isso fica fora do escopo desta tarefa e o passe expira naturalmente em 12 h.
- Nenhum dado sensível vai pro `localStorage` além do próprio JWT (que o cliente já recebe).

### Arquivos tocados
- `supabase/functions/verify-proposal-access/index.ts` — TTL para 12 h.
- `src/pages/public/PropostaPublica.tsx` — restauração de sessão + persistência do JWT.

## O que NÃO entra
- Não muda nada no editor interno nem nas tabs.
- Não mexe em rate limiting, auditoria, fluxo de PDF ou tracking.
- Não cria tabela nova nem migration.
