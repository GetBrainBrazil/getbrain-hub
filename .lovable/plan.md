
Plano para corrigir a aba de Colaboradores com máscaras, abertura direta em edição e permissões por perfil.

## Objetivo

Na criação/edição de colaborador:

1. Aplicar máscara campo por campo nos dados pessoais, contatos, dados bancários, PIX, endereço e contrato.
2. Ao abrir um colaborador:
   - ADMIN abre direto em modo edição para qualquer colaborador.
   - Usuário comum abre direto em modo edição apenas quando for o próprio colaborador.
   - Usuário comum abre em modo visualização quando for colaborador de outra pessoa.
3. Garantir que a regra não seja apenas visual: aplicar também proteção no backend para impedir edição indevida.

## Parte 1 — Máscaras no formulário de colaborador

Arquivo principal:

- `src/components/config-financeiras/ColaboradoresTab.tsx`

Vou reaproveitar os helpers já existentes em:

- `src/components/config-financeiras/shared.tsx`

Máscaras/correções por campo:

### Dados principais

- `CPF`
  - Já usa `applyCpfMask`.
  - Vou manter e garantir `inputMode="numeric"`.

### Contatos

- `Telefone`
  - Já usa `applyPhoneMask`.
  - Vou manter e garantir `inputMode="tel"`.
- `E-mail`
  - Não tem máscara visual, mas terá normalização:
    - `trim`
    - lowercase ao adicionar
    - validação antes de inserir na lista.

### Dados bancários

- `Agência`
  - Usar `applyAgenciaMask`.
  - Exemplo: `1234-5`.
  - `inputMode="numeric"`.
- `Conta`
  - Usar `applyContaMask`.
  - Exemplo: `12345-6`.
  - `inputMode="numeric"`.
- `Chaves PIX`
  - Usar `applyPixMask`.
  - Detectar tipo com `detectPixType`.
  - Mostrar badge do tipo da chave:
    - CPF
    - CNPJ
    - Telefone
    - E-mail
    - Aleatória
  - Igual ao padrão já usado em `ContasBancariasTab.tsx`.

### Endereço

- `CEP`
  - Já usa `applyCepMask`.
  - Vou garantir `inputMode="numeric"`.
- `Estado`
  - Já usa select com UF.
- `Cidade`, `Endereço`, `Número`, `Bairro`, `Complemento`
  - Não exigem máscara numérica, mas vou normalizar espaços ao salvar.
  - `Número` continuará livre porque pode conter `S/N`, bloco, casa, etc.

### Informações contratuais

- `Data de Admissão`
  - Já usa `type="date"`.
- `Salário Base`
  - Já usa `applyMoneyMask`.
  - Vou garantir `inputMode="decimal"`.

## Parte 2 — Abrir colaborador direto no modo correto

Hoje o fluxo é:

```text
Lista → Visualização → botão Editar → Edição
```

Vou alterar para:

```text
ADMIN clicou em qualquer colaborador → Edição direta
Usuário comum clicou no próprio colaborador → Edição direta
Usuário comum clicou em colaborador de outra pessoa → Visualização
```

Também vou ajustar os botões:

- No modo visualização para usuário comum:
  - Não exibir botão `Editar` quando ele não puder editar aquele colaborador.
  - Não exibir `Excluir`.
  - Não permitir ativar/inativar na listagem.
- Para ADMIN:
  - Pode editar qualquer colaborador.
  - Pode ativar/inativar qualquer colaborador.
  - Pode excluir, mantendo a confirmação atual.
- Para usuário comum no próprio registro:
  - Pode editar o próprio registro.
  - Não poderá excluir o próprio colaborador.
  - Não poderá ativar/inativar, a menos que seja ADMIN.

## Parte 3 — Como identificar ADMIN e “o próprio colaborador”

Vou usar a estrutura já existente de roles:

- tabela `user_roles`
- função `has_role`
- role `admin`

No frontend:

- Buscar se o usuário atual é ADMIN consultando sua role.
- Considerar que o colaborador pertence ao usuário quando:
  - o e-mail do usuário logado aparece em `colaboradores.emails`, ou
  - `colaboradores.created_by` é o usuário atual como fallback para registros antigos.

Essa abordagem evita criar uma relação frágil com tabela de usuários e funciona com os dados que já existem no formulário.

## Parte 4 — Segurança no backend

Será necessária uma migration para trocar a política ampla atual de `colaboradores`.

Hoje existe:

```sql
Authenticated full access colaboradores
```

Isso permite que qualquer usuário autenticado edite qualquer colaborador.

Vou substituir por políticas mais restritas:

### Select

Todos os usuários autenticados continuam podendo visualizar colaboradores:

```text
authenticated can select colaboradores
```

Motivo: o usuário pediu que usuários comuns consigam abrir os cards de outras pessoas em modo visualização.

### Insert

Apenas ADMIN poderá criar colaboradores.

Motivo: se usuário comum pudesse criar colaborador livremente, poderia criar um registro com seu e-mail e ganhar controle indevido.

### Update

Pode atualizar quando:

```text
admin
OU
auth.email() está dentro de colaboradores.emails
OU
created_by = auth.uid()
```

### Delete

Apenas ADMIN poderá excluir.

### Observação importante

Também vou impedir no frontend ações que o backend bloquearia, para a experiência ficar limpa, mas a regra real ficará protegida no backend.

## Parte 5 — Ajustes visuais e UX

No `ColaboradoresTab.tsx`:

- Substituir o ícone de olho por um indicador coerente:
  - ADMIN / próprio usuário: ícone de edição.
  - Outros colaboradores: ícone de visualização.
- Ajustar títulos:
  - Edição direta: `Editar Colaborador`
  - Visualização: `Detalhes do Colaborador`
- Quando usuário comum abrir colaborador de outra pessoa:
  - Mostrar um aviso discreto no topo ou subtítulo dizendo que ele está em modo somente leitura.

## Arquivos previstos

### Alterar

- `src/components/config-financeiras/ColaboradoresTab.tsx`

### Criar migration

- `supabase/migrations/<timestamp>_restrict_colaboradores_permissions.sql`

## Validação

Após implementar, vou validar:

1. TypeScript sem erros.
2. Máscaras funcionando:
   - CPF
   - telefone
   - agência
   - conta
   - PIX
   - CEP
   - salário
3. Clique no colaborador:
   - ADMIN abre direto editando.
   - usuário comum abre o próprio direto editando.
   - usuário comum abre outros em visualização.
4. Backend bloqueia update/delete indevido mesmo que alguém tente forçar pela interface.
