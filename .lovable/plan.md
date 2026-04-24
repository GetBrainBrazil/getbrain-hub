## Objetivo

Hoje os campos de edição inline (como o "Nome" do projeto na tela de detalhe) têm largura fixa em pixels (`w-[320px]`). Quando o texto digitado é maior que a caixa, o conteúdo fica oculto e o usuário só vê a parte final via cursor.

Quero introduzir um padrão **reutilizável em todo o sistema**: inputs/textos editáveis que **expandem horizontalmente** conforme o usuário digita, até um limite máximo, mantendo a UI estável.

## Comportamento

- Largura inicial igual a um valor mínimo (ex.: 220–320px, configurável por uso).
- À medida que o texto cresce, a largura do input cresce em conjunto, sempre cabendo o texto + um padding pequeno.
- Limite máximo configurável (default: largura do container pai). Quando atinge o máximo, comportamento volta ao scroll horizontal nativo do `<input>`.
- Funciona ao colar texto, ao usar `defaultValue`, ao mudar a fonte/tamanho — porque mede a partir das próprias estilizações do input.
- Não muda a altura — continua single-line. Para multilinha existe `<Textarea>` (fora de escopo).
- Acessibilidade preservada: continua sendo um `<input>` nativo, com todas as props (placeholder, aria-*, name, etc.).

## Implementação técnica

### 1. Novo componente `AutoWidthInput`

Arquivo novo: `src/components/ui/auto-width-input.tsx`.

API:

```tsx
<AutoWidthInput
  value={nameDraft}
  onChange={(e) => setNameDraft(e.target.value)}
  minWidth={220}        // px, default 160
  maxWidth="100%"       // px | string CSS, default "100%"
  placeholder="..."
  className="h-8 ..."   // mesmas classes do Input atual
/>
```

Implementação:

- Wrapper `<span class="relative inline-block align-middle">` com:
  - Um `<span aria-hidden>` invisível (`whitespace-pre`, `absolute opacity-0 pointer-events-none`, `top-0 left-0`, mesmas propriedades tipográficas do input via `font-inherit` / `text-base md:text-sm`) que renderiza `value || placeholder || ' '` + 1ch de folga.
  - O `<input>` real com `width: <medida>` aplicado via `style`, clamp entre `minWidth` e `maxWidth` usando `min(maxWidth, max(minWidth, measuredWidth + paddingX))`.
- Mede via `useLayoutEffect` lendo `spanRef.current.offsetWidth` sempre que `value` (ou placeholder) mudar.
- Padding/border do input contabilizados: medir o conteúdo e somar `2*px-3 (24px) + 2*border (2px) = 26px`, mais 2px de folga para evitar que o caret empurre o caractere.
- Classes base idênticas às do `<Input>` shadcn (`flex h-10 rounded-md border border-input bg-background px-3 py-2 …`) — reaproveitar via `cn()` para herdar a mesma estética.
- Encaminhar `ref` com `forwardRef<HTMLInputElement>`.

Pseudo-código:

```tsx
export const AutoWidthInput = React.forwardRef<HTMLInputElement, Props>(
  ({ value, placeholder, minWidth = 160, maxWidth = "100%", className, style, ...rest }, ref) => {
    const mirrorRef = useRef<HTMLSpanElement>(null);
    const [width, setWidth] = useState<number>(minWidth);

    useLayoutEffect(() => {
      if (!mirrorRef.current) return;
      const measured = mirrorRef.current.offsetWidth;
      // px-3 (12*2) + border (1*2) + caret folga (2)
      setWidth(Math.max(minWidth, measured + 28));
    }, [value, placeholder, minWidth]);

    const widthStyle =
      typeof maxWidth === "number"
        ? { width: Math.min(maxWidth, width) }
        : { width, maxWidth };

    return (
      <span className="relative inline-block max-w-full align-middle">
        <span
          ref={mirrorRef}
          aria-hidden
          className={cn(
            "invisible absolute left-0 top-0 whitespace-pre",
            // mesmas classes tipográficas do input
            "text-base md:text-sm px-0",
            className,
          )}
        >
          {String(value ?? "") || placeholder || " "}
        </span>
        <input
          ref={ref}
          value={value}
          placeholder={placeholder}
          className={cn(
            "flex h-10 rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
            className,
          )}
          style={{ ...widthStyle, ...style }}
          {...rest}
        />
      </span>
    );
  },
);
```

Observações:
- Usa `whitespace-pre` para preservar espaços no medidor.
- O mirror herda o mesmo `className` do input para garantir mesmo `font-size`/`font-weight`/`tracking` (importante quando o `nameDraft` está em `text-2xl font-bold`, por exemplo).
- `max-w-full` no wrapper impede que o input "estoure" o container pai, ainda que `maxWidth="100%"`.

### 2. Aplicação inicial — onde trocar `<Input>` por `<AutoWidthInput>`

Critério: **somente em campos de edição inline** onde a largura fixa é arbitrária e o texto pode crescer (nomes, títulos, códigos curtos). **Não trocar** em formulários de Dialog/cards onde o input já ocupa a largura total do grid (lá `w-full` faz sentido).

Locais a atualizar nesta primeira leva:

- `src/pages/ProjetoDetalhe.tsx`:
  - Campo "Nome" no card "Informações do Projeto" (linha ~1159): substituir.
  - Edição inline do título grande no header (`saveName` / `<Input … h-9 min-w-[320px] text-2xl font-bold>`): substituir, com `minWidth={320}`.
- `src/pages/ProjetoDetalhe.tsx`: campo "Tipo" continua `Select`, sem mudança.

Para outros lugares do sistema com o mesmo problema (CRM, tarefas, etc.), o componente fica disponível e iremos migrando sob demanda — não vou varrer o sistema inteiro de uma vez para evitar regressões; aplico nesta tela como referência e o usuário decide quais próximos.

### 3. Sem mudanças

- Não muda `src/components/ui/input.tsx` (Input padrão continua igual, com largura controlada por classe).
- Não muda schema, hooks ou rotas.
- Não muda Textarea (fora de escopo).

## Fora de escopo

- Auto-resize de **altura** (multilinha) — usar `<Textarea>` com componente próprio se necessário no futuro.
- Migrar todos os formulários do sistema agora — só os pontos de edição inline da tela de detalhe do projeto. O componente fica pronto para uso global.
