import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export default function AddReservationDialog({ open, onClose, onSuccess }) {
  const [form, setForm] = useState({
    customer_name: "",
    customer_phone: "",
    date: format(new Date(), "yyyy-MM-dd"),
    time: "",
    party_size: 2,
    notes: "",
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    await base44.entities.Reservation.create({
      ...form,
      party_size: Number(form.party_size),
      status: "aguardando",
    });
    setSaving(false);
    setForm({
      customer_name: "",
      customer_phone: "",
      date: format(new Date(), "yyyy-MM-dd"),
      time: "",
      party_size: 2,
      notes: "",
    });
    onSuccess();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle className="font-heading text-lg">Nova Reserva</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Nome do cliente *</Label>
            <Input
              required
              value={form.customer_name}
              onChange={(e) => setForm({ ...form, customer_name: e.target.value })}
              placeholder="Nome completo"
              className="rounded-xl mt-1"
            />
          </div>
          <div>
            <Label>Telefone</Label>
            <Input
              value={form.customer_phone}
              onChange={(e) => setForm({ ...form, customer_phone: e.target.value })}
              placeholder="(11) 99999-9999"
              className="rounded-xl mt-1"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Data *</Label>
              <Input
                type="date"
                required
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                className="rounded-xl mt-1"
              />
            </div>
            <div>
              <Label>Horário *</Label>
              <Input
                type="time"
                required
                value={form.time}
                onChange={(e) => setForm({ ...form, time: e.target.value })}
                className="rounded-xl mt-1"
              />
            </div>
          </div>
          <div>
            <Label>Nº de pessoas *</Label>
            <Input
              type="number"
              required
              min={1}
              value={form.party_size}
              onChange={(e) => setForm({ ...form, party_size: e.target.value })}
              className="rounded-xl mt-1"
            />
          </div>
          <div>
            <Label>Observações</Label>
            <Textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Ex: aniversário, cadeirante..."
              className="rounded-xl mt-1"
              rows={2}
            />
          </div>
          <Button
            type="submit"
            disabled={saving}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl"
          >
            {saving ? "Salvando..." : "Criar Reserva"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}