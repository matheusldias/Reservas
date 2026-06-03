import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export default function AddWaitlistDialog({ open, onClose, onSuccess }) {
  const [form, setForm] = useState({
    customer_name: "",
    customer_phone: "",
    party_size: 2,
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    await base44.entities.WaitlistEntry.create({
      ...form,
      party_size: Number(form.party_size),
      status: "aguardando",
    });
    setSaving(false);
    setForm({ customer_name: "", customer_phone: "", party_size: 2 });
    onSuccess();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle className="font-heading text-lg">Adicionar à Fila</DialogTitle>
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
          <Button
            type="submit"
            disabled={saving}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl"
          >
            {saving ? "Salvando..." : "Adicionar à Fila"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}