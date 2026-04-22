

## Substituir confirms/alerts nativos do navegador por diálogos in-app

Vou aplicar uma regra global para o sistema todo: nenhuma chamada `confirm()`, `alert()` ou `prompt()` do navegador. Toda confirmação usa o `useConfirm()` (já existente em `src/components/ConfirmDialog.tsx`) e toda notificação usa `toast` (sonner).

### Memória (regra permanente)
Adicionar em `mem://index.md` (Core):
> Nunca usar `confirm()`, `alert()` ou `prompt()` nativos do navegador. Sempre usar `useConfirm()` de `@/components/ConfirmDialog` para confirmações e `toast` de `sonner` para notificações.

### Arquivos a corrigir (substituir `confirm(...)` por `await confirmDialog({...})`)

| Arquivo | Onde | Ação |
|---|---|---|
| `src/pages/ProjetoDetalhe.tsx` | `handleStatusChange` (mudar status do projeto — caso do print) e `archiveProject` | Trocar `confirm()` por `useConfirm()` com título e descrição em pt-BR |
| `src/pages/Projetos.tsx` | `archiveProject` | idem |
| `src/components/projetos/ProjetoDrawer.tsx` | `handleStatusChange` | idem |
| `src/components/projetos/AbaDependencias.tsx` | `softDelete` | idem (variant destructive) |
| `src/components/projetos/AbaIntegracoes.tsx` | `softDelete` | idem |
| `src/components/projetos/AbaRiscos.tsx` | `softDelete` | idem |
| `src/components/projetos/AbaMarcos.tsx` | `softDelete` | idem |
| `src/components/RegistrarComprovanteWizard.tsx` | `window.confirm` da conciliação | Trocar por `useConfirm()` (descrição com nome do match e valor) |

### Padrão a aplicar em cada arquivo
```tsx
const { confirm: confirmDialog, dialog: confirmDialogEl } = useConfirm();
// ...
if (!(await confirmDialog({
  title: 'Mudar status do projeto?',
  description: `Novo status: "${getStatusLabel(newStatus)}".`,
  confirmLabel: 'Mudar',
  variant: 'default',
}))) return;
// ...
return (<>{/* ...JSX existente... */}{confirmDialogEl}</>);
```

Para deletes manter `variant: 'destructive'` e `confirmLabel: 'Remover'`.

### Resultado
Quando o usuário clicar para mudar status (ou qualquer ação que pedia confirmação), aparecerá o `AlertDialog` estilizado da GetBrain (dark + ciano) em vez do popup branco do Chrome do print. Toasts continuam usando sonner para feedback de sucesso/erro.

Nenhuma alteração em schema, rotas, ou outras telas além das listadas.

