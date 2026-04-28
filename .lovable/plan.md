## Objetivo

Remover os botões de ação visíveis no hover (estrela / lápis / lixeira) do card de contato e tornar **o card inteiro clicável** para abrir o modo de edição inline. As ações secundárias (definir principal, remover) ficam dentro do formulário de edição. Aplicar em **CRM e Projetos** (mesmo componente compartilhado), preservando o diferencial visual de cada módulo.

## Escopo

Arquivo único: `src/components/shared/CompanyContactsPanel.tsx` (usado pelos dois wrappers — `CardContatos` em Projetos e `CompanyContactsManager` no CRM).

## Mudanças no card (modo leitura)

1. **Remover** o bloco de ações no canto direito (estrela/lápis/lixeira com `opacity-0 group-hover`).
2. **Card inteiro clicável** (`onClick` + `role="button"` + `tabIndex={0}` + Enter/Space) → abre modo edição (`setEditingPersonId(c.person_id)`).
3. Manter `cursor-pointer` e um leve `hover:border-accent/30 hover:bg-accent/5` para indicar interatividade (estilo Projetos da image-115).
4. **Estrela "Principal"** continua visível como badge informativo já existente (`PRINCIPAL` ao lado do nome) — não como botão de ação no card.
5. Links `mailto:` / `tel:` recebem `e.stopPropagation()` para não disparar a edição quando o usuário clica em email/telefone.
6. Badges de papéis comerciais (CRM) e o `CommercialRolePicker` também recebem `stopPropagation` (continuam editáveis sem abrir o form).
7. Ícone de empresa (`Building2`) ao lado do cargo, igual ao mock do Projetos (image-115 mostra `COO`/`CEO` com ícone).

## Mudanças no formulário de edição

O `ContactForm` (modo edit de contato existente) ganha duas ações extras no rodapé, ao lado de Cancelar/Salvar:

1. **Botão "Definir como principal"** (esquerda, `variant="ghost"`, ícone `Star`) — só aparece se ainda não for principal. Usa o mesmo `handleTogglePrimary` atual.
2. **Botão "Remover contato"** (esquerda, `variant="ghost"` destrutivo, ícone `Trash2`) — usa o `handleUnlink` atual com confirmação.

Assim, todas as ações continuam acessíveis, só que dentro do contexto de edição (consistente com o pedido: "clicar e abrir o modo de edição").

## Diferenciação visual entre módulos

- **Projetos** (`showRoles=false`): card limpo, sem linha de papéis comerciais — fica idêntico à image-115.
- **CRM** (`showRoles=true`): mantém a linha de badges de papel + picker abaixo dos contatos; identidade visual cyan/accent do CRM preservada via tokens existentes (`bg-accent/15`, `text-accent`, `border-accent/30`). Sem mudanças em cores.

## Acessibilidade

- `role="button"`, `tabIndex={0}`, `aria-label="Editar contato {nome}"`.
- Handler de teclado: Enter/Space abre edição.
- `stopPropagation` em todos os elementos interativos internos (mailto, tel, badge X, papel picker).

## Arquivos tocados

- `src/components/shared/CompanyContactsPanel.tsx` — única edição.

Nenhuma migração, nenhum hook novo, nenhuma quebra de API dos wrappers.
