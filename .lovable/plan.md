

## Máscaras em Dados Bancários e Chaves PIX

Adicionar formatação automática nos campos **Agência**, **Conta** e **Chave PIX** da aba "Contas Bancárias" em Configurações Financeiras.

### Mudança 1 — Máscaras de agência e conta (`shared.tsx`)

Adicionar dois helpers novos em `src/components/config-financeiras/shared.tsx`:

- **`applyAgenciaMask(v)`** — só dígitos, máx 5, formato `1234` ou `1234-5` (último dígito vira verificador quando há 5).
- **`applyContaMask(v)`** — só dígitos + 1 dígito verificador no final, formato `12345-6` (sempre separa o último com hífen quando há ≥ 2 dígitos). Limite 13 dígitos.

### Mudança 2 — Detecção e máscara dinâmica de Chave PIX (`shared.tsx`)

Novo helper **`detectPixType(value)`** retorna: `"cpf" | "cnpj" | "email" | "telefone" | "aleatoria" | "indefinido"`.

Lógica:
- Se contém `@` → **email** (sem máscara, valida formato no blur)
- Se for só dígitos:
  - 11 dígitos começando com `(` ou tendo padrão de DDD → **telefone** → máscara `(11) 91234-5678`
  - 11 dígitos sem padrão telefônico → **CPF** → máscara `123.456.789-01`
  - 14 dígitos → **CNPJ** → máscara `12.345.678/0001-90`
- Se tem letras + números + 32 chars com hífens (UUID v4) → **chave aleatória** → mantém como digitado
- Caso contrário → **indefinido** (sem máscara enquanto digita)

Novo helper **`applyPixMask(value)`** que detecta o tipo em tempo real e aplica a máscara correspondente:
- Detecção é por tentativa: se input começa com dígitos puros e tem ≤ 11 dígitos, aplica máscara progressiva de telefone OU CPF (escolhe pela presença de DDD válido nos 2 primeiros dígitos: 11-99); ao chegar em 14 dígitos puros, aplica máscara de CNPJ.
- Se aparecer `@` ou letra (que não seja UUID), para de aplicar máscara numérica.

### Mudança 3 — Aplicar nos inputs (`ContasBancariasTab.tsx`)

Linhas 259-260 (formulário edit/new):

```tsx
<Input value={form.agencia}
  onChange={e => setForm({ ...form, agencia: applyAgenciaMask(e.target.value) })}
  placeholder="1234" inputMode="numeric" />

<Input value={form.conta}
  onChange={e => setForm({ ...form, conta: applyContaMask(e.target.value) })}
  placeholder="12345-6" inputMode="numeric" />
```

Linha 267 (input de nova chave PIX):

```tsx
<Input value={newPix}
  onChange={e => setNewPix(applyPixMask(e.target.value))}
  placeholder="CPF, CNPJ, e-mail, telefone, chave aleatória..."
  onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addPix())} />
```

Adicionar **badge sutil** ao lado do input mostrando o tipo detectado em tempo real (ex: chip `CPF`, `E-mail`, `Telefone`, `CNPJ`, `Aleatória`), usando `detectPixType(newPix)`. Isso dá feedback imediato sem ser intrusivo.

### Mudança 4 — Exibir tipo na lista de chaves cadastradas

Linha 269-274: junto de cada chave já adicionada, mostrar o tipo entre parênteses em texto muted:

```
[CPF]  123.456.789-01                                    [×]
[E-mail]  daniel@getbrain.com                            [×]
```

### Comportamento preservado

- Dados antigos no banco (não formatados) continuam sendo exibidos como estão na view mode — a máscara só é aplicada na **edição/digitação**.
- O salvamento mantém o valor formatado (com pontuação) — assim a busca e a exibição ficam consistentes.
- Sem mudança de schema, sem migration. Apenas frontend.

### Arquivos afetados

- **Modificado**: `src/components/config-financeiras/shared.tsx` — adiciona `applyAgenciaMask`, `applyContaMask`, `detectPixType`, `applyPixMask`
- **Modificado**: `src/components/config-financeiras/ContasBancariasTab.tsx` — aplica máscaras nos 3 inputs + badge de tipo PIX

