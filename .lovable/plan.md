## O que muda

Duas adições no editor de proposta:

### 1. Senha de acesso visível abaixo do link público

No bloco "Link público da proposta" da aba Resumo, adicionar uma segunda linha com a senha (oculta por padrão, com botão de mostrar/copiar) e um botão pequeno "Trocar senha" que abre o `RedefinirSenhaDialog` que já existe.

A senha em texto fica em `proposals.access_password_plain` (já existe, é populada pelo "Gerar e enviar" e atualizada pelo "Redefinir senha"). Quando estiver `null` (proposta antiga), mostra "—" e oferece o botão de redefinir.

Layout proposto dentro do `PublicLinkBlock`:

```text
┌─────────────────────────────────────────────────────────┐
│ LINK PÚBLICO DA PROPOSTA              [QR][↗][👁][Copiar]│
│ hub.getbrain.com.br/p/YwZzgqHA…                         │
│ ─────────────────────────────────────────────────────── │
│ 🔑 Senha:  •••••••••   [👁] [⧉]   [Trocar senha]        │
│ Vence em 31 dias · Nenhuma visualização ainda           │
└─────────────────────────────────────────────────────────┘
```

### 2. "Gerar e enviar" entrega de fato por WhatsApp/Email para o contato principal do CRM

Hoje o `GerarEEnviarDialog` na fase de sucesso mostra três botões (WhatsApp/Email/Abrir) que apenas abrem `wa.me/?text=...` e `mailto:?body=...` sem destinatário. Nada vai automaticamente para o contato do CRM.

A nova versão vai:

1. **Buscar o contato principal automaticamente** — quando a proposta tem `company_id`, carrega de `company_people` o registro com `is_primary_contact = true`, com `full_name`, `email` e `phone` da tabela `people`. (Para a proposta atual: Vanessa, `admin@sunbrightengenharia.com.br`, `5521976526871`.)
2. **Mostrar um cartão "Destinatário"** já na tela de gerar/enviar, com nome + email + telefone, e checkboxes "Enviar por email" e "Enviar por WhatsApp" (ambos marcados por padrão se o contato tiver email/phone respectivamente). Permitir editar email/telefone se quiser ajustar antes de enviar. Se não houver contato principal, mostrar aviso com link "Cadastrar contato no CRM".
3. **Ao clicar em "Gerar e enviar"**:
   - Faz tudo que já fazia: define senha, marca como `enviada`, gera token, registra evento `sent`.
   - Se "Enviar por WhatsApp" marcado: abre `https://wa.me/<phone-limpo>?text=<mensagem>` em nova aba (com o número do contato preenchido). Pré-formata mensagem com saudação personalizada usando primeiro nome.
   - Se "Enviar por email" marcado: invoca a edge function `send-proposal-email` (nova, descrita abaixo) que envia HTML formatado direto para o email do contato.
   - Registra cada canal usado em `proposal_interactions` (`channel: 'email' | 'whatsapp'`, `direction: 'outbound'`, `auto_generated: true`) — assim aparece no Tracking.

### 3. Decisão: como enviar o email?

Esta é a parte que precisa de escolha sua, porque envolve provisionamento. Opções:

**A. Lovable Email (recomendada) com domínio próprio da GetBrain.** Vou pedir pra você configurar `notify.getbrain.com.br` (ou o subdomínio que preferir). O email sai como "GetBrain <propostas@getbrain.com.br>", deliverability boa, sem mexer com Resend/SendGrid. Setup é guiado por um modal que abre uma vez; depois só funciona.

**B. Resend via connector da Lovable.** Você cria conta no Resend, conecta como connector da Lovable, e o email sai pelo Resend usando seu domínio verificado lá. Útil se você já tem conta Resend ativa.

**C. Por enquanto sem email — apenas WhatsApp.** Implementamos só o canal WhatsApp agora (que não precisa de infra) e deixamos email pra um próximo passo. Você ainda ganha 80% do valor (WhatsApp é o canal mais usado para isso na prática).

A opção A é a mais limpa para o longo prazo. A C é a mais rápida de entregar agora.

## Arquivos afetados

- `src/components/orcamentos/page/tabs/TabResumo.tsx` — `PublicLinkBlock` ganha linha de senha + botão "Trocar senha".
- `src/pages/financeiro/OrcamentoEditarDetalhe.tsx` — passa `accessPassword` e `onOpenPwdDialog` para `TabResumo`.
- `src/components/orcamentos/GerarEEnviarDialog.tsx` — fase form ganha cartão de destinatário (carregado via novo hook), checkboxes de canais; fase success mantém botões manuais como fallback mas pré-preenche destinatário.
- `src/hooks/crm/usePrimaryContact.ts` — novo hook: dado `company_id`, retorna `{ name, email, phone }` do contato principal.
- `src/lib/orcamentos/sendProposal.ts` — novo helper: formata mensagem, dispara WhatsApp e/ou edge function de email, registra interações.
- `supabase/functions/send-proposal-email/index.ts` — apenas se você escolher A ou B. Recebe `{ proposalId, recipientEmail, recipientName, message, link, password }`, manda email via Lovable Email (opção A) ou Resend (opção B), com template HTML simples e branded.

## Resultado esperado

- Senha de acesso visível e copiável diretamente no Resumo, com botão de redefinir.
- "Gerar e enviar" deixa de ser só "criar token" e vira de fato envio: identifica o contato principal do CRM, sugere os canais disponíveis, e envia. Tudo registrado no Tracking.

Antes de começar a implementar, preciso que você responda: **qual canal de email — A, B ou C?**
