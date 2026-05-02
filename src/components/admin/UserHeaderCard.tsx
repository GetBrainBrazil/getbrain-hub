import { useRef, useState } from "react";
import { Camera, Loader2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { uploadAvatar } from "@/hooks/useUsuarios";
import { useUpdatePerfilCampos } from "@/hooks/useUsuarioFicha";
import { toast } from "sonner";
import { AvatarCropDialog } from "@/components/shared/AvatarCropDialog";

interface Props {
  userId: string;
  fullName: string;
  email: string | null;
  avatarUrl: string | null;
  cargoNome: string | null;
  cargoCor: string | null;
  canUpload: boolean;
}

export function UserHeaderCard({ userId, fullName, email, avatarUrl, cargoNome, cargoCor, canUpload }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const updateMut = useUpdatePerfilCampos();

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
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
      const url = await uploadAvatar(blob, userId);
      await updateMut.mutateAsync({ id: userId, patch: { avatar_url: url } });
      toast.success("Foto atualizada");
      setPendingFile(null);
      if (fileRef.current) fileRef.current.value = "";
    } catch (err: any) {
      toast.error("Erro: " + err.message);
    } finally {
      setUploading(false);
    }
  }

  function handleCancelCrop() {
    setPendingFile(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  return (
    <Card className="p-5 sm:p-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6">
        <div className="relative">
          <Avatar className="h-20 w-20 sm:h-24 sm:w-24">
            <AvatarImage src={avatarUrl ?? undefined} />
            <AvatarFallback className="text-xl">{fullName?.slice(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
          {canUpload && (
            <>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="absolute bottom-0 right-0 h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-md hover:bg-primary/90"
                aria-label="Trocar foto"
              >
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
              </button>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onPick} />
            </>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="font-serif text-2xl sm:text-3xl tracking-tight truncate">{fullName}</h2>
          {email && <div className="text-sm text-muted-foreground mt-0.5">{email}</div>}
          {cargoNome && (
            <Badge className="mt-2 rounded-full" style={{ background: cargoCor ?? undefined, color: "#fff" }}>
              {cargoNome}
            </Badge>
          )}
          <p className="text-xs text-muted-foreground mt-2">JPG ou PNG. Máx 2MB.</p>
        </div>
      </div>
    </Card>
  );
}
