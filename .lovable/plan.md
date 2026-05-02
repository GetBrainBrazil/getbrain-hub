## Avatar com recorte (crop) antes do upload

Hoje, ao escolher uma imagem em `UserHeaderCard` (ou no `UsuarioDialog`), ela é enviada direto para o storage `avatars`. Resultado: a foto fica esticada/descentralizada porque o `Avatar` é redondo e a imagem original raramente é quadrada.

A proposta é interceptar o arquivo escolhido, abrir um **modal de recorte** com área circular 1:1, deixar o usuário arrastar/zoom e só então gerar o blob final que vai pro storage.

### O que o usuário vai ver

1. Clica no ícone da câmera no avatar.
2. Escolhe um arquivo (JPG/PNG, até 2MB — limite atual mantido).
3. Abre um dialog "Ajustar foto de perfil" com:
   - Preview central com **máscara circular** sobre a imagem.
   - Controles: arrastar a imagem, slider de **Zoom** (1x–3x) e botão **Girar 90°**.
   - Rodapé: "Cancelar" / "Salvar foto".
4. Ao salvar:
   - Recorte é exportado em **512×512 px JPEG (quality 0.9)** via canvas.
   - Faz upload no bucket `avatars` (mesmo fluxo de hoje).
   - Atualiza `profiles.avatar_url`, mostra toast "Foto atualizada".

### Arquivos

**Novo**
- `src/components/shared/AvatarCropDialog.tsx`
  - Props: `open`, `file: File | null`, `onCancel()`, `onConfirm(blob: Blob)`.
  - Usa `react-easy-crop` (lib pequena, popular, já compatível com o stack) para a UX de pan/zoom/rotate.
  - Função utilitária local `getCroppedBlob(imageSrc, pixelCrop, rotation, size=512)` desenhando num `<canvas>` offscreen e retornando JPEG blob.

**Editado**
- `src/hooks/useUsuarios.ts`
  - `uploadAvatar` aceita `File | Blob` (hoje só `File`). Ajustar tipagem e usar `contentType: "image/jpeg"` quando vier blob; extensão padrão `jpg`.
- `src/components/admin/UserHeaderCard.tsx`
  - `onPick` apenas guarda o arquivo em estado e abre o `AvatarCropDialog`. Upload acontece no `onConfirm(blob)`.
  - Manter validação de tamanho (≤2MB) antes de abrir o crop.
- `src/components/configuracoes/UsuarioDialog.tsx`
  - Mesmo tratamento: arquivo selecionado → abre crop → confirma → faz upload → set `avatar_url`.

### Dependência nova

- `react-easy-crop` (≈10KB gz, MIT). Instalada via `bun add react-easy-crop`.

### Detalhes técnicos

- `aspect = 1`, `cropShape = "round"`, `showGrid = false` no `Cropper` para refletir o avatar circular real.
- Output sempre 512×512 (suficiente para o `h-24 w-24` do header e qualquer reuso). Garante peso baixo (~50–80KB) e qualidade nítida em telas retina.
- Rotação aplicada no canvas antes do crop para não depender de EXIF.
- Reset do `<input type="file">` (`fileRef.current.value = ""`) após confirmar/cancelar para permitir reabrir o mesmo arquivo.
- Sem mudanças no schema, no bucket nem em RLS.

### Fora de escopo

- Filtros / ajustes de cor.
- Upload de avatar em outros lugares que não usam `uploadAvatar` (ActorAvatar etc. continuam só lendo `avatar_url`).
- Crop para imagens fora do contexto de avatar (logo da agência, anexos de proposta etc.) — pode ser uma extensão futura reaproveitando o mesmo componente.
