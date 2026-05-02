Vou corrigir os pontos onde ainda aparece o quadrado/bolinha azul com “G” e garantir que a logo anexada seja usada de forma consistente nas propostas.

Plano:

1. Adicionar a logo anexada como asset oficial da proposta
   - Copiar `logogetbrain-2.svg` para `src/assets` com um nome claro, por exemplo `logo-getbrain-oficial.svg`.
   - Usar esse asset nas telas públicas e na geração do QR Code.

2. Trocar o topo da proposta pública
   - Em `src/pages/public/PropostaPublica.tsx`, substituir o ícone compacto que hoje pode aparecer como “G”/badge por uma renderização da logo anexada.
   - Ajustar o tamanho no header para ficar legível, sem estourar o layout: desktop e mobile.
   - Manter o código da proposta ao lado, como no print, mas com a marca correta.

3. Remover o fallback visual “G” do autor
   - O fallback atual do `AuthorAvatar` usa gradiente azul e inicial “G” quando não há foto do autor.
   - Vou trocar esse fallback por um avatar com a logo anexada, evitando que o “G” azul apareça em seções como “Carta de Daniel” e CTA final.

4. Atualizar o QR Code personalizado
   - O QR Code já tem lógica de logo centralizada, mas está importando `logo-getbrain.png`.
   - Vou apontar a geração para a logo anexada, mantendo correção de erro alta (`H`) e fundo branco atrás da marca para continuar escaneável.
   - Se necessário, ajusto a proporção da logo no centro para ficar bonito sem prejudicar a leitura.

5. Revisar usos restantes de marca na proposta
   - Verificar imports e ocorrências de `logo-getbrain.png/svg` e `GetBrain` na proposta pública e PDF.
   - Padronizar os pontos visuais principais: tela de senha, header da proposta, footer e QR Code.
   - Não vou remover textos institucionais como “GetBrain” onde eles são conteúdo da proposta; o foco é trocar a logo/ícone visual incorreto.

Arquivos previstos:
- `src/assets/logo-getbrain-oficial.svg` novo asset a partir do arquivo anexado.
- `src/pages/public/PropostaPublica.tsx` para header, tela de senha/footer e fallback do avatar.
- `src/lib/orcamentos/generateBrandedQrDataUrl.ts` para usar a logo anexada no QR Code.
- Possivelmente `src/components/orcamentos/templates/TemplateInovacaoTecnologica/PDFTemplate/pages/CoverPage.tsx` se o PDF também estiver usando uma versão antiga da logo.

Resultado esperado:
- O “G” azul do print deixa de aparecer.
- A proposta pública passa a exibir a logo anexada no topo.
- O QR Code continua funcional e passa a usar a logo anexada no centro.
- A marca visual fica consistente nas propostas.