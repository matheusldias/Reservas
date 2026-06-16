import React, { useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export default function RemoveWaitlistDialog({ entry, onClose, onSuccess }) {
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  const handleConfirm = async () => {
    setSaving(true);
    await supabase
      .from("waitlist_entries")
      .update({ status: "removido", removed_at: new Date().toISOString(), removal_reason: reason })
      .eq("id", entry.id);
    setSaving(false);
    setReason("");
    onSuccess();
    onClose();
  };

  return (
    <Dialog open={!!entry} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle className="font-heading text-lg">Remover da Fila</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Remover <strong>{entry?.customer_name}</strong> da fila?
        </p>
        <div>
          <Label>Motivo da remoção</Label>
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Ex: cliente desistiu, foi embora..."
            className="rounded-xl mt-1"
            rows={3}
          />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onClose} className="flex-1 rounded-xl">
            Voltar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={saving}
            className="flex-1 bg-red-600 hover:bg-red-700 text-white rounded-xl"
          >
            {saving ? "Removendo..." : "Confirmar Remoção"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}