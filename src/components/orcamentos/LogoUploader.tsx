import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Upload, X, ImageIcon, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  proposalId: string;
  value: string | null;
  onChange: (url: string | null) => void;
}

const ACCEPT = "image/png,image/jpeg,image/jpg,image/svg+xml,image/webp";
const MAX_BYTES = 2 * 1024 * 1024;

export function LogoUploader({ proposalId, value, onChange }: Props) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function handleFile(file: File) {
    if (file.size > MAX_BYTES) {
      toast.error("Logo deve ter no máximo 2MB");
      return;
    }
    setBusy(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "png";
      const path = `${proposalId}/logos/logo-${Date.now()}.${ext}`;
      const { error } = await supabase.storage
        .from("proposals")
        .upload(path, file, { contentType: file.type, upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from("proposals").getPublicUrl(path);
      onChange(data.publicUrl);
      toast.success("Logo enviado");
    } catch (e: any) {
      toast.error(e?.message || "Erro ao enviar logo");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        <div className="h-16 w-24 flex items-center justify-center rounded-md border border-border bg-muted/30 overflow-hidden shrink-0">
          {value ? (
            <img
              src={value}
              alt="Logo"
              className="max-h-full max-w-full object-contain"
            />
          ) : (
            <ImageIcon className="h-6 w-6 text-muted-foreground/50" />
          )}
        </div>
        <div className="flex flex-col gap-1.5">
          <input
            ref={ref}
            type="file"
            accept={ACCEPT}
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
              e.target.value = "";
            }}
          />
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => ref.current?.click()}
            disabled={busy}
          >
            {busy ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Upload className="h-3.5 w-3.5" />
            )}
            {value ? "Trocar logo" : "Enviar logo"}
          </Button>
          {value && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="text-destructive h-7 px-2"
              onClick={() => onChange(null)}
            >
              <X className="h-3 w-3" /> Remover
            </Button>
          )}
        </div>
      </div>
      <p className="text-[11px] text-muted-foreground">
        PNG, JPG, SVG ou WEBP. Máx 2MB. Aparece na capa do PDF.
      </p>
    </div>
  );
}
