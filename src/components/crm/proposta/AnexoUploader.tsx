import { useRef, useState } from 'react';
import { Upload, X, ImageIcon, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface SingleProps {
  mode: 'single';
  dealId: string;
  folder: string;          // ex: 'organograma' | 'mockup'
  value: string | null;    // url pública/assinada
  onChange: (url: string | null) => void;
  accept?: string;
  label?: string;
}

interface MultipleProps {
  mode: 'multiple';
  dealId: string;
  folder: string;
  value: string[];
  onChange: (urls: string[]) => void;
  accept?: string;
  label?: string;
  max?: number;
}

type Props = SingleProps | MultipleProps;

const BUCKET = 'deal-attachments';

async function uploadFile(file: File, dealId: string, folder: string): Promise<string> {
  const ext = file.name.split('.').pop() ?? 'bin';
  const path = `${dealId}/${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: '3600',
    upsert: false,
  });
  if (error) throw error;
  // Bucket privado → URL assinada longa (1 ano)
  const { data, error: signErr } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, 60 * 60 * 24 * 365);
  if (signErr) throw signErr;
  return data.signedUrl;
}

export function AnexoUploader(props: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setBusy(true);
    try {
      if (props.mode === 'single') {
        const url = await uploadFile(files[0], props.dealId, props.folder);
        props.onChange(url);
        toast.success('Arquivo enviado');
      } else {
        const max = props.max ?? 12;
        const remaining = max - props.value.length;
        if (remaining <= 0) {
          toast.error(`Máximo de ${max} arquivos atingido`);
          return;
        }
        const list = Array.from(files).slice(0, remaining);
        const uploaded = await Promise.all(list.map((f) => uploadFile(f, props.dealId, props.folder)));
        props.onChange([...props.value, ...uploaded]);
        toast.success(`${uploaded.length} arquivo(s) enviado(s)`);
      }
    } catch (e: any) {
      toast.error(`Erro ao enviar: ${e?.message ?? 'tente novamente'}`);
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const triggerPick = () => inputRef.current?.click();

  if (props.mode === 'single') {
    return (
      <div className="space-y-2">
        <input
          ref={inputRef}
          type="file"
          accept={props.accept ?? 'image/*,.pdf'}
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
        {props.value ? (
          <div className="relative overflow-hidden rounded-md border border-border bg-muted/20">
            {/\.pdf($|\?)/i.test(props.value) ? (
              <a
                href={props.value}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 p-4 text-sm text-accent hover:underline"
              >
                <ImageIcon className="h-4 w-4" /> Abrir PDF
              </a>
            ) : (
              <a href={props.value} target="_blank" rel="noreferrer">
                <img src={props.value} alt={props.label ?? 'anexo'} className="max-h-80 w-full object-contain" />
              </a>
            )}
            <Button
              size="icon"
              variant="destructive"
              className="absolute right-2 top-2 h-7 w-7"
              onClick={() => props.onChange(null)}
              disabled={busy}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        ) : (
          <button
            type="button"
            onClick={triggerPick}
            disabled={busy}
            className={cn(
              'flex w-full flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed border-border bg-muted/10 px-4 py-8 text-sm text-muted-foreground transition-colors hover:border-accent/50 hover:bg-muted/20',
              busy && 'opacity-50',
            )}
          >
            {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Upload className="h-5 w-5" />}
            <span>{busy ? 'Enviando…' : props.label ?? 'Clique pra enviar arquivo'}</span>
          </button>
        )}
      </div>
    );
  }

  // multiple
  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        accept={props.accept ?? 'image/*'}
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
      {props.value.length > 0 && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
          {props.value.map((url, i) => (
            <div key={url + i} className="group relative overflow-hidden rounded-md border border-border bg-muted/20">
              <a href={url} target="_blank" rel="noreferrer">
                <img src={url} alt={`screenshot-${i + 1}`} className="aspect-video w-full object-cover" />
              </a>
              <Button
                size="icon"
                variant="destructive"
                className="absolute right-1 top-1 h-6 w-6 opacity-0 transition-opacity group-hover:opacity-100"
                onClick={() => props.onChange(props.value.filter((_, j) => j !== i))}
                disabled={busy}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      )}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={triggerPick}
        disabled={busy}
        className="w-full"
      >
        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
        {busy ? 'Enviando…' : props.label ?? 'Adicionar prints'}
      </Button>
    </div>
  );
}
