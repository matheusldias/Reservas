import React, { useState } from "react";
import { supabase } from "@/lib/supabase";
import { format } from "date-fns";
import { normalizePhone, formatPhoneMask } from "@/lib/phone";
import { linkCustomer } from "@/lib/customers";
import useCustomerLookup from "@/hooks/useCustomerLookup";
import CustomerBadge from "@/components/customers/CustomerBadge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

const emptyForm = {
  customer_name: "",
  customer_phone: "",
  customer_email: "",
  party_size: 2,
  priority: false,
  quoted_wait_minutes: "",
  notes: "",
};

export default function AddWaitlistDialog({ open, onClose, onSuccess, restaurantId }) {
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const foundCustomer = useCustomerLookup(restaurantId, form.customer_phone);

  React.useEffect(() => {
    if (foundCustomer) {
      setForm((f) => ({
        ...f,
        customer_name: f.customer_name || foundCustomer.name || "",
        customer_email: f.customer_email || foundCustomer.email || "",
      }));
    }
  }, [foundCustomer]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    const customerId = await linkCustomer(restaurantId, {
      name: form.customer_name,
      phone: form.customer_phone,
      email: form.customer_email,
    });
    const { quoted_wait_minutes, ...rest } = form;
    await supabase.from("waitlist_entries").insert({
      ...rest,
      customer_phone: normalizePhone(form.customer_phone),
      ...(customerId ? { customer_id: customerId } : {}),
      party_size: Number(form.party_size),
      ...(quoted_wait_minutes ? { quoted_wait_minutes: Number(quoted_wait_minutes) } : {}),
      status: "aguardando",
      service_date: format(new Date(), "yyyy-MM-dd"),
      restaurant_id: restaurantId,
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
          <DialogTitle className="font-heading text-lg">Adicionar Cliente</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>
              <span className="text-destructive">*</span> Nome
            </Label>
            <Input
              required
              value={form.customer_name}
              onChange={(e) => setForm({ ...form, customer_name: e.target.value })}
              placeholder="Nome do cliente"
              className="rounded-xl mt-1"
            />
          </div>
          <div>
            <Label>Telefone</Label>
            <div className="flex items-center mt-1">
              <span className="flex items-center gap-1 h-9 px-3 border border-input border-r-0 rounded-l-xl bg-muted text-sm text-muted-foreground">
                🇧🇷 +55
              </span>
              <Input
                type="tel"
                value={form.customer_phone}
                onChange={(e) =>
                  setForm({ ...form, customer_phone: formatPhoneMask(e.target.value) })
                }
                placeholder="(11) 99999-9999"
                className="rounded-r-xl rounded-l-none"
              />
            </div>
            <CustomerBadge customer={foundCustomer} />
          </div>
          <div>
            <Label>E-mail</Label>
            <Input
              type="email"
              value={form.customer_email}
              onChange={(e) => setForm({ ...form, customer_email: e.target.value })}
              placeholder="E-mail"
              className="rounded-xl mt-1"
            />
          </div>
          <div>
            <Label>
              <span className="text-destructive">*</span> Pessoas
            </Label>
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
            <Label>Espera estimada (min)</Label>
            <Input
              type="number"
              min={0}
              value={form.quoted_wait_minutes}
              onChange={(e) => setForm({ ...form, quoted_wait_minutes: e.target.value })}
              placeholder="Ex: 20"
              className="rounded-xl mt-1"
            />
          </div>
          <div className="flex items-center gap-3">
            <Switch
              checked={form.priority}
              onCheckedChange={(checked) => setForm({ ...form, priority: checked })}
            />
            <Label className="cursor-pointer" onClick={() => setForm({ ...form, priority: !form.priority })}>
              Atendimento prioritário
            </Label>
          </div>
          <div>
            <Label>Mais informações</Label>
            <Textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="rounded-xl mt-1 h-20"
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