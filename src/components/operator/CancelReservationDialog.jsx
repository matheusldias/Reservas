import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export default function CancelReservationDialog({ reservation, onClose, onSuccess }) {
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  const handleConfirm = async () => {
    setSaving(true);
    await base44.entities.Reservation.update(reservation.id, {
      status: "cancelada",
      cancellation_reason: reason,
    });
    setSaving(false);
    setReason("");
    onSuccess();
    onClose();
  };

  return (
    <Dialog open={!!reservation} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle className="font-heading text-lg">Cancelar Reserva</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Cancelar a reserva de <strong>{reservation?.customer_name}</strong>?
        </p>
        <div>
          <Label>Motivo do cancelamento</Label>
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Ex: cliente solicitou, restaurante lotado..."
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
            {saving ? "Cancelando..." : "Confirmar Cancelamento"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}