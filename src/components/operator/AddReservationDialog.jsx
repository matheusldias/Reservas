import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useQuery } from "@tanstack/react-query";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { checkCapacity, toMinutes } from "@/lib/capacity";
import { normalizePhone, formatPhoneMask } from "@/lib/phone";
import { linkCustomer } from "@/lib/customers";
import useCustomerLookup from "@/hooks/useCustomerLookup";
import CustomerBadge from "@/components/customers/CustomerBadge";
import { AlertTriangle } from "lucide-react";

const ORIGINS = [
  { value: "telefone", label: "Telefone" },
  { value: "online", label: "Online" },
  { value: "balcao", label: "Balcão" },
  { value: "whatsapp", label: "WhatsApp" },
];

export default function AddReservationDialog({ open, onClose, onSuccess, restaurant }) {
  const restaurantId = restaurant?.id;
  const defaultDuration = restaurant?.default_duration_minutes || 90;

  const emptyForm = {
    customer_name: "",
    customer_phone: "",
    customer_email: "",
    date: format(new Date(), "yyyy-MM-dd"),
    time: "",
    duration_minutes: defaultDuration,
    party_size: 2,
    dining_room_id: "",
    origin: "telefone",
    notes: "",
  };

  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const foundCustomer = useCustomerLookup(restaurantId, form.customer_phone);

  useEffect(() => {
    if (foundCustomer) {
      setForm((f) => ({
        ...f,
        customer_name: f.customer_name || foundCustomer.name || "",
        customer_email: f.customer_email || foundCustomer.email || "",
      }));
    }
  }, [foundCustomer]);

  useEffect(() => {
    if (open) {
      setForm((f) => ({ ...f, duration_minutes: defaultDuration }));
      setError("");
    }
  }, [open, defaultDuration]);

  const { data: rooms = [] } = useQuery({
    queryKey: ["rooms", restaurantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dining_rooms")
        .select("*")
        .eq("restaurant_id", restaurantId);
      if (error) throw error;
      return data;
    },
    enabled: !!restaurantId && open,
  });

  const { data: dayReservations = [] } = useQuery({
    queryKey: ["capacity-reservations", restaurantId, form.date, form.dining_room_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reservations")
        .select("*")
        .eq("restaurant_id", restaurantId)
        .eq("date", form.date)
        .eq("dining_room_id", form.dining_room_id);
      if (error) throw error;
      return data;
    },
    enabled: !!restaurantId && !!form.date && !!form.dining_room_id && open,
  });

  const room = rooms.find((r) => r.id === form.dining_room_id);
  const capacityInfo = checkCapacity({
    room,
    reservations: dayReservations,
    date: form.date,
    time: form.time ? toMinutes(form.time) : null,
    durationMinutes: Number(form.duration_minutes),
    partySize: Number(form.party_size),
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (capacityInfo && !capacityInfo.ok) {
      setError(
        `Capacidade excedida: restam ${capacityInfo.remaining} lugares neste horário`
      );
      return;
    }

    setSaving(true);
    const customerId = await linkCustomer(restaurantId, {
      name: form.customer_name,
      phone: form.customer_phone,
      email: form.customer_email,
    });
    const { time: timeStr, ...formRest } = form;
    await supabase.from("reservations").insert({
      ...formRest,
      start_min: toMinutes(timeStr),
      customer_phone: normalizePhone(form.customer_phone),
      party_size: Number(form.party_size),
      duration_minutes: Number(form.duration_minutes),
      status: "aguardando",
      restaurant_id: restaurantId,
      ...(customerId ? { customer_id: customerId } : {}),
    });
    setSaving(false);
    setForm(emptyForm);
    onSuccess();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md rounded-2xl max-h-[90vh] overflow-y-auto">
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
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Telefone</Label>
              <Input
                value={form.customer_phone}
                onChange={(e) =>
                  setForm({ ...form, customer_phone: formatPhoneMask(e.target.value) })
                }
                placeholder="(11) 99999-9999"
                className="rounded-xl mt-1"
              />
            </div>
            <div>
              <Label>E-mail</Label>
              <Input
                type="email"
                value={form.customer_email}
                onChange={(e) => setForm({ ...form, customer_email: e.target.value })}
                placeholder="email@exemplo.com"
                className="rounded-xl mt-1"
              />
            </div>
          </div>

          <CustomerBadge customer={foundCustomer} />

          {foundCustomer && (foundCustomer.no_show_count || 0) >= 2 && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl px-3 py-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              Atenção: este cliente tem {foundCustomer.no_show_count} no-shows registrados.
            </div>
          )}

          <div>
            <Label>Salão *</Label>
            <Select
              value={form.dining_room_id}
              onValueChange={(v) => setForm({ ...form, dining_room_id: v })}
            >
              <SelectTrigger className="rounded-xl mt-1">
                <SelectValue placeholder="Escolha o salão" />
              </SelectTrigger>
              <SelectContent>
                {rooms.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Duração (minutos)</Label>
              <Input
                type="number"
                min={15}
                step={15}
                value={form.duration_minutes}
                onChange={(e) => setForm({ ...form, duration_minutes: e.target.value })}
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
          </div>
          <div>
            <Label>Origem</Label>
            <Select
              value={form.origin}
              onValueChange={(v) => setForm({ ...form, origin: v })}
            >
              <SelectTrigger className="rounded-xl mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ORIGINS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {capacityInfo && (
            <div
              className={`text-xs rounded-xl px-3 py-2 border ${
                capacityInfo.ok
                  ? "bg-green-50 border-green-200 text-green-700"
                  : "bg-red-50 border-red-200 text-red-600"
              }`}
            >
              Ocupação neste horário: {capacityInfo.occupied}/{capacityInfo.capacity} lugares
              · Restam {capacityInfo.remaining}
            </div>
          )}

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

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
              {error}
            </p>
          )}

          <Button
            type="submit"
            disabled={saving || !form.dining_room_id}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl"
          >
            {saving ? "Salvando..." : "Criar Reserva"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}