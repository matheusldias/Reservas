import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
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

export default function CustomerEditDialog({ customer, onClose, onSaved }) {
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (customer) {
      setForm({
        name: customer.name || "",
        email: customer.email || "",
        birthday: customer.birthday || "",
        tags: (customer.tags || []).join(", "),
        notes: customer.notes || "",
        vip: !!customer.vip,
        marketing_consent: !!customer.marketing_consent,
      });
    }
  }, [customer]);

  if (!customer || !form) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    await supabase
      .from("customers")
      .update({
        name: form.name,
        email: form.email,
        ...(form.birthday ? { birthday: form.birthday } : {}),
        tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
        notes: form.notes,
        vip: form.vip,
        marketing_consent: form.marketing_consent,
      })
      .eq("id", customer.id);
    setSaving(false);
    onSaved();
    onClose();
  };

  return (
    <Dialog open={!!customer} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md rounded-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading text-lg">Editar Cliente</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Nome *</Label>
            <Input
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="rounded-xl mt-1"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>E-mail</Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="rounded-xl mt-1"
              />
            </div>
            <div>
              <Label>Aniversário</Label>
              <Input
                type="date"
                value={form.birthday}
                onChange={(e) => setForm({ ...form, birthday: e.target.value })}
                className="rounded-xl mt-1"
              />
            </div>
          </div>
          <div>
            <Label>Etiquetas (separadas por vírgula)</Label>
            <Input
              value={form.tags}
              onChange={(e) => setForm({ ...form, tags: e.target.value })}
              placeholder="Ex: aniversário, alergia a glúten"
              className="rounded-xl mt-1"
            />
          </div>
          <div>
            <Label>Observações internas</Label>
            <Textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="rounded-xl mt-1 h-20"
            />
          </div>
          <div className="flex items-center justify-between">
            <Label>Cliente VIP</Label>
            <Switch
              checked={form.vip}
              onCheckedChange={(v) => setForm({ ...form, vip: v })}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label>Consentimento de marketing (LGPD)</Label>
            <Switch
              checked={form.marketing_consent}
              onCheckedChange={(v) => setForm({ ...form, marketing_consent: v })}
            />
          </div>
          <Button
            type="submit"
            disabled={saving}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl"
          >
            {saving ? "Salvando..." : "Salvar"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}