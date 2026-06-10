import React, { useState, useEffect } from "react";
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
import { Textarea } from "@/components/ui/textarea";

export default function RestaurantFormDialog({ open, onClose, restaurant, onSaved }) {
  const [form, setForm] = useState({
    name: "",
    address: "",
    phone: "",
    opening_hours: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setForm({
        name: restaurant?.name || "",
        address: restaurant?.address || "",
        phone: restaurant?.phone || "",
        opening_hours: restaurant?.opening_hours || "",
      });
    }
  }, [open, restaurant]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    if (restaurant) {
      await base44.entities.Restaurant.update(restaurant.id, form);
    } else {
      await base44.entities.Restaurant.create(form);
    }
    setSaving(false);
    onSaved();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle className="font-heading text-lg">
            {restaurant ? "Editar Restaurante" : "Novo Restaurante"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Nome do restaurante *</Label>
            <Input
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Ex: Restaurante Bela Vista"
              className="rounded-xl mt-1"
            />
          </div>
          <div>
            <Label>Endereço</Label>
            <Input
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              placeholder="Rua, número, bairro, cidade"
              className="rounded-xl mt-1"
            />
          </div>
          <div>
            <Label>Telefone</Label>
            <Input
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="(11) 3333-4444"
              className="rounded-xl mt-1"
            />
          </div>
          <div>
            <Label>Horário de funcionamento</Label>
            <Textarea
              value={form.opening_hours}
              onChange={(e) => setForm({ ...form, opening_hours: e.target.value })}
              placeholder="Ex: Seg-Sex 11h-23h, Sáb-Dom 11h-00h"
              className="rounded-xl mt-1"
              rows={2}
            />
          </div>
          <Button
            type="submit"
            disabled={saving}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl"
          >
            {saving ? "Salvando..." : restaurant ? "Salvar Alterações" : "Criar Restaurante"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}