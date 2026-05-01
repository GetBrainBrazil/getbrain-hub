## Sub-abas dentro de "Descoberta" no detalhe do deal

Hoje a aba **Descoberta** (em `/crm/d/:code`) empilha verticalmente 5 zonas grandes: Cliente, Dor, Solução, Dependências e Comercial. Vou separar essas 5 zonas em **sub-abas internas** com o mesmo visual segmentado do modal de Ganho (pill ativa com fundo claro + ícone + label).

### Comportamento

- 5 sub-abas: **Cliente · Dor · Solução · Dependências · Comercial** (mesma ordem atual).
- Estilo `Tabs` do shadcn (idêntico ao do modal de Ganho), com ícone à esquerda do nome em cada trigger.
- Em cada aba, mostra **só** a zona correspondente — não empilha mais tudo junto.
- Aba ativa fica persistida via `usePersistedState` com chave `crm-deal-discovery-subtab` (cada usuário retoma onde estava). Padrão: `cliente`.
- Indicador de status nos triggers: bolinha verde (`text-success`) em "Dor" quando `painOk` e em "Solução" quando `solucaoOk` — reaproveita os booleanos já calculados em `computeCompleteness()`.
- Mobile: `TabsList grid grid-cols-5`, ícones sempre visíveis, label oculto em telas <sm (`hidden sm:inline`), igual o modal de Ganho.

### Limpeza pendente

Remover o `StageMiniStepper` que adicionei por engano em `src/components/crm/DealCard.tsx` na rodada anterior — não era isso que você pediu. O card do Pipeline volta ao visual original.

### Arquivos afetados

- `src/pages/crm/CrmDealDetail.tsx` — substituir o conteúdo do `<TabsContent value="descoberta">` por um `<Tabs>` aninhado com 5 sub-abas. Passar `painOk`/`solucaoOk` (já computados acima na página) para os triggers.
- `src/components/crm/DealCard.tsx` — reverter a adição do `StageMiniStepper`.

### Esboço técnico

```tsx
// Em CrmDealDetail.tsx, dentro de TabsContent value="descoberta"
const [discoverySubtab, setDiscoverySubtab] = usePersistedState<string>(
  'crm-deal-discovery-subtab',
  'cliente',
);

<Tabs value={discoverySubtab} onValueChange={setDiscoverySubtab}>
  <TabsList className="grid w-full grid-cols-5 mb-4">
    <TabsTrigger value="cliente" className="gap-1.5">
      <Building2 className="h-3.5 w-3.5" />
      <span className="hidden sm:inline">Cliente</span>
    </TabsTrigger>
    <TabsTrigger value="dor" className="gap-1.5">
      <AlertCircle className="h-3.5 w-3.5" />
      <span className="hidden sm:inline">Dor</span>
      {painOk && <CheckCircle2 className="h-3 w-3 text-success" />}
    </TabsTrigger>
    <TabsTrigger value="solucao" className="gap-1.5">
      <Lightbulb className="h-3.5 w-3.5" />
      <span className="hidden sm:inline">Solução</span>
      {solucaoOk && <CheckCircle2 className="h-3 w-3 text-success" />}
    </TabsTrigger>
    <TabsTrigger value="dependencias" className="gap-1.5">
      <Link2 className="h-3.5 w-3.5" />
      <span className="hidden sm:inline">Dependências</span>
    </TabsTrigger>
    <TabsTrigger value="comercial" className="gap-1.5">
      <Banknote className="h-3.5 w-3.5" />
      <span className="hidden sm:inline">Comercial</span>
    </TabsTrigger>
  </TabsList>

  <TabsContent value="cliente"><ZoneCliente deal={deal} /></TabsContent>
  <TabsContent value="dor"><ZoneDor deal={deal} save={save} /></TabsContent>
  <TabsContent value="solucao"><ZoneSolucao deal={deal} save={save} /></TabsContent>
  <TabsContent value="dependencias">
    <ZoneDependencias dealId={deal.id} dealCode={deal.code} dealTitle={deal.title} />
  </TabsContent>
  <TabsContent value="comercial"><ZoneComercial deal={deal} /></TabsContent>
</Tabs>
```

Sem mudanças em hooks, banco, RLS ou outros componentes. As zonas continuam idênticas — só muda como elas são apresentadas (separadas em sub-abas em vez de empilhadas).
