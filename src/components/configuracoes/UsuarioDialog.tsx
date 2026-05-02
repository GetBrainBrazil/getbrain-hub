import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Camera, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useCargos } from "@/hooks/useCargos";
import { Usuario, useCreateUsuario, useUpdateUsuario, uploadAvatar } from "@/hooks/useUsuarios";
import { supabase } from "@/integrations/supabase/client";
import { AvatarCropDialog } from "@/components/shared/AvatarCropDialog";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  usuario?: Usuario | null;
}

export function UsuarioDialog({ open, onOpenChange, usuario }: Props) {
  const isEdit = !!usuario;
  const { data: cargos = [] } = useCargos();
  const createMut = useCreateUsuario();
  const updateMut = useUpdateUsuario();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [password, setPassword] = useState("");
  const [cargoId, setCargoId] = useState<string>("");
  const [ativo, setAtivo] = useState(true);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  useEffect(() => {
    if (open) {
      setFullName(usuario?.full_name ?? "");
      setEmail(usuario?.email ?? "");
      setTelefone(usuario?.telefone ?? "");
      setPassword("");
      setCargoId(usuario?.cargo_id ?? "");
      setAtivo(usuario?.ativo ?? true);
      setAvatarUrl(usuario?.avatar_url ?? null);
    }
  }, [open, usuario]);

  function handleAvatarSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Máx 2MB");
      if (fileRef.current) fileRef.current.value = "";
      return;
    }
    setPendingFile(file);
  }

  async function handleConfirmCrop(blob: Blob) {
    setUploading(true);
    try {
      const targetId = usuario?.id ?? (await supabase.auth.getUser()).data.user?.id ?? "tmp";
      const url = await uploadAvatar(blob, targetId);
      setAvatarUrl(url);
      setPendingFile(null);
      if (fileRef.current) fileRef.current.value = "";
    } catch (err: any) {
      toast.error("Erro ao enviar foto: " + err.message);
    } finally {
      setUploading(false);
    }
  }

  function handleCancelCrop() {
    setPendingFile(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function handleSubmit() {
    if (!fullName.trim()) return toast.error("Nome obrigatório");
    if (!email.trim()) return toast.error("Email obrigatório");
    try {
      if (isEdit && usuario) {
        await updateMut.mutateAsync({
          user_id: usuario.id,
          full_name: fullName,
          email: email !== usuario.email ? email : undefined,
          password: password || undefined,
          telefone: telefone || null,
          ativo,
          cargo_id: cargoId || null,
          avatar_url: avatarUrl,
        });
        toast.success("Usuário atualizado");
      } else {
        if (password.length < 6) return toast.error("Senha deve ter no mínimo 6 caracteres");
        await createMut.mutateAsync({
          email, password, full_name: fullName,
          telefone: telefone || undefined,
          cargo_id: cargoId || undefined,
          avatar_url: avatarUrl || undefined,
        });
        toast.success("Usuário criado");
      }
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message ?? "Erro ao salvar");
    }
  }

  const loading = createMut.isPending || updateMut.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar Usuário" : "Novo Usuário"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <button type="button" onClick={() => fileRef.current?.click()} className="relative group">
              <Avatar className="h-20 w-20">
                <AvatarImage src={avatarUrl ?? undefined} />
                <AvatarFallback>{fullName.slice(0, 2).toUpperCase() || "?"}</AvatarFallback>
              </Avatar>
              <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                {uploading ? <Loader2 className="h-5 w-5 text-white animate-spin" /> : <Camera className="h-5 w-5 text-white" />}
              </div>
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarSelect} />
            <div className="text-sm text-muted-foreground">Clique na foto para enviar</div>
          </div>

          <div>
            <Label>Nome completo *</Label>
            <Input value={fullName} onChange={e => setFullName(e.target.value)} />
          </div>
          <div>
            <Label>Email *</Label>
            <Input type="email" value={email} onChange={e => setEmail(e.target.value)} />
          </div>
          <div>
            <Label>Telefone</Label>
            <Input value={telefone} onChange={e => setTelefone(e.target.value)} placeholder="(11) 99999-9999" />
          </div>
          <div>
            <Label>{isEdit ? "Nova senha (opcional)" : "Senha *"}</Label>
            <Input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder={isEdit ? "Deixe em branco para manter" : "Mínimo 6 caracteres"} />
          </div>
          <div>
            <Label>Cargo</Label>
            <Select value={cargoId || "none"} onValueChange={v => setCargoId(v === "none" ? "" : v)}>
              <SelectTrigger><SelectValue placeholder="Sem cargo" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sem cargo</SelectItem>
                {cargos.map(c => (
                  <SelectItem key={c.id} value={c.id}>
                    <span className="inline-flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full" style={{ background: c.cor }} />
                      {c.nome}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {isEdit && (
            <div className="flex items-center justify-between rounded-md border p-3">
              <div>
                <div className="font-medium text-sm">Usuário ativo</div>
                <div className="text-xs text-muted-foreground">Desative para bloquear o acesso</div>
              </div>
              <Switch checked={ativo} onCheckedChange={setAtivo} />
            </div>
          )}
        </div>
        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full sm:w-auto">Cancelar</Button>
          <Button onClick={handleSubmit} disabled={loading} className="w-full sm:w-auto">
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {isEdit ? "Salvar" : "Criar Usuário"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
