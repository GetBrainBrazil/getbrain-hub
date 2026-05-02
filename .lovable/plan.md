## Auto-preenchimento por CEP + máscaras nos campos de endereço

Hoje, na aba **Endereço & Emergência** do perfil (`UsuarioFichaPage`):
- O lookup de CEP só dispara no `onBlur` e nunca sobrescreve o que já está preenchido.
- CEP, UF e telefones de emergência aceitam qualquer texto livre.

A proposta deixa o CEP totalmente automático e padroniza máscaras em todos os campos do formulário.

### Comportamento desejado

1. Usuário digita o CEP → máscara aplica `00000-000` enquanto digita.
2. Quando atinge **8 dígitos**, dispara automaticamente o lookup ViaCEP (com debounce de ~400ms para evitar chamadas em cada tecla).
3. Resposta válida → **sobrescreve** logradouro, bairro, cidade, UF e país (mesmo que já estivessem preenchidos), e mostra um toast `Endereço preenchido pelo CEP`.
4. CEP inválido (ViaCEP retorna `erro`) → toast `CEP não encontrado`, sem mexer nos campos.
5. Se o usuário trocar o CEP depois, o ciclo repete: novo CEP de 8 dígitos = novo preenchimento automático.
6. Indicador visual de "buscando…" no campo CEP enquanto a chamada está em curso (ícone `Loader2` à direita do input).

### Máscaras aplicadas

| Campo | Máscara |
|---|---|
| CEP | `00000-000` (`formatCEP`) |
| Estado (UF) | 2 letras maiúsculas (`formatUF`) |
| Telefone (Celular já existente) | `formatPhoneBR` (já feito) |
| Telefone do contato de emergência | `formatPhoneBR` (já feito) |
| Número (endereço) | apenas dígitos + até 6 chars (livre p/ "S/N" não — ver abaixo) |

Decisão sobre **Número**: aceitar dígitos + letras (alguns endereços têm "123A", "S/N") sem máscara restritiva — apenas `maxLength=10`. Sem mudança funcional.

Os outros campos (Endereço, Complemento, Bairro, Cidade, País, Nome de emergência, Plano de saúde) **não recebem máscara** — são texto livre. Apenas `maxLength` defensivo (100–150 chars).

### Arquivos editados

**`src/lib/formatters.ts`**
Adicionar:
```ts
export function formatCEP(value: string | null | undefined): string {
  if (!value) return "";
  const d = String(value).replace(/\D/g, "").slice(0, 8);
  return d.length <= 5 ? d : `${d.slice(0,5)}-${d.slice(5)}`;
}
export function formatUF(value: string | null | undefined): string {
  if (!value) return "";
  return String(value).replace(/[^a-zA-Z]/g, "").toUpperCase().slice(0, 2);
}
```

**`src/pages/admin/UsuarioFichaPage.tsx`**
- Importar `formatCEP`, `formatUF` de `@/lib/formatters`.
- Estado novo: `const [cepLoading, setCepLoading] = useState(false);` e ref `lastLookedUpCep` para evitar refazer a busca do mesmo CEP.
- `useEffect` que observa `cep`: extrai dígitos; se `length === 8` e diferente do último lookup, dispara `lookupCep` com debounce de 400ms via `setTimeout` cancelável; ao terminar, sobrescreve `endereco`, `bairro`, `cidade`, `estado`, `pais`. Toasts de sucesso/erro.
- Substituir o input do CEP:
  ```tsx
  <Input
    value={cep}
    onChange={e => setCep(formatCEP(e.target.value))}
    placeholder="00000-000"
    inputMode="numeric"
    maxLength={9}
    disabled={!canEdit}
  />
  ```
  com um wrapper `relative` para mostrar o `Loader2` quando `cepLoading`.
- Remover o handler manual `handleCepBlur` (substituído pelo efeito).
- Trocar input do Estado: `onChange={e => setEstado(formatUF(e.target.value))}` `maxLength={2}`.
- Adicionar `maxLength` em endereço (120), complemento (60), bairro (80), cidade (80), país (60), número (10), nome emergência (100), plano saúde (60).

### Detalhes técnicos

- O debounce vive dentro do `useEffect`; cleanup cancela o timer anterior se o usuário continuar digitando.
- `lastLookedUpCep` é uma `useRef<string | null>` para evitar lookup duplicado quando a `ficha` carrega e popula o estado inicial. Setar o ref também depois do primeiro fill vindo da `ficha` para não disparar busca redundante.
- Não há mudança de schema. A função `lookupCep` em `src/lib/cep.ts` já cobre o cenário; nada muda lá.
- Validação visual mínima — `formatCEP` impede caracteres inválidos, então a chamada só dispara com 8 dígitos.

### Fora de escopo

- Aplicar a mesma lógica em outras telas (Clientes, Fornecedores, Contratos) — pode ser feito em iteração futura reaproveitando o efeito.
- Trocar provedor de CEP por BrasilAPI/AwesomeAPI — ViaCEP segue suficiente.
