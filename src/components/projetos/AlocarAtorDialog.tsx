import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { PROJECT_ACTOR_ROLE_OPTIONS, ProjectActorRole } from "@/lib/projetos-helpers";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  projectId: string;
  excludeActorIds: string[];
  onAllocated: (allocation: {
    id: string;
    actor_id: string;
    role_in_project: ProjectActorRole;
    allocation_percent: number | null;
    started_at: string | null;
    actor?: { id: string; display_name: string; avatar_url: string | null };
  }) => void;
}

export function AlocarAtorDialog({ open, onOpenChange, projectId, excludeActorIds, onAllocated }: Props) {
  const [actors, setActors] = useState<{ id: string; display_name: string; avatar_url: string | null }[]>([]);
  const [actorId, setActorId] = useState("");
  const [role, setRole] = useState<ProjectActorRole>("developer");
  const [allocation, setAllocation] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    (async () => {
      const { data } = await supabase
        .from("actors")
        .select("id, display_name, avatar_url")
        .eq("type", "human")
        .eq("status", "active")
        .is("deleted_at", null)
        .order("display_name");
      setActors((data || []).filter((a) => !excludeActorIds.includes(a.id)));
    })();
  }, [open, excludeActorIds]);

  async function handleSave() {
    if (!actorId) {
      toast.error("Selecione um ator");
      return;
    }
    setSaving(true);
    const selectedActor = actors.find((actor) => actor.id === actorId);
    const { data, error } = await supabase
      .from("project_actors")
      .insert({
        project_id: projectId,
        actor_id: actorId,
        role_in_project: role,
        allocation_percent: allocation ? Number(allocation) : null,
      } as any)
      .select("id, role_in_project, allocation_percent, started_at, actor_id")
      .single();
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Ator alocado");
    setActorId("");
    setAllocation("");
    onOpenChange(false);
    onAllocated({
      ...(data as any),
      actor: selectedActor
        ? {
            id: selectedActor.id,
            display_name: selectedActor.display_name,
            avatar_url: selectedActor.avatar_url,
          }
        : undefined,
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Alocar Ator</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Ator</Label>
            <Select value={actorId} onValueChange={setActorId}>
              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                {actors.map((a) => (
                  <SelectItem key={a.id} value={a.id}>{a.display_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Papel</Label>
            <Select value={role} onValueChange={(v) => setRole(v as ProjectActorRole)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {PROJECT_ACTOR_ROLE_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Alocação (%)</Label>
            <Input type="number" step="0.01" value={allocation} onChange={(e) => setAllocation(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? "Salvando..." : "Alocar"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
