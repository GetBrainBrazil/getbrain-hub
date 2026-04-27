## Plano de correção

Vou corrigir o loop do botão de voltar no Admin, que hoje pode navegar para `/` e ser redirecionado de volta para `/admin/usuarios` pelo rastreador de última rota.

### O que será ajustado

1. **Parar de salvar rotas do Admin como “última rota útil”**
   - O rastreador não deve registrar `/admin/...`, `/perfil` ou `/login` como destino de retorno principal.
   - Isso evita que a Home (`/`) mande o usuário de volta para Admin automaticamente.

2. **Criar uma rota segura de saída do Admin**
   - O botão da seta vai usar uma função única para decidir o destino:
     - primeiro: a última aba real visitada antes do Admin;
     - se não existir: uma rota segura fora do Admin.
   - Nunca vai retornar para `/admin/...`.

3. **Usar navegação com substituição de histórico**
   - A seta do Admin vai navegar com `replace: true`, para impedir que o histórico do navegador fique alternando entre Admin e a rota anterior.

4. **Corrigir o redirecionamento da Home**
   - Se a última rota salva for Admin, perfil ou login, a Home não deve redirecionar para ela.
   - Isso remove o comportamento de “reload em Admin”.

### Arquivos previstos

- `src/components/RouteTracker.tsx`
- `src/pages/admin/AdminLayout.tsx`
- `src/App.tsx`

### Resultado esperado

Ao clicar na seta no topo da tela Admin, você sai imediatamente do Admin e volta para a aba/área em que estava antes. Se não houver histórico anterior válido, o sistema abre uma área padrão fora do Admin, sem recarregar de volta para `/admin/usuarios`.