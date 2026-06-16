import React, { useState } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function InviteUserDialog({ open, onClose, restaurants, onInvited }) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("hostess");
  const [restaurantId, setRestaurantId] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage("");

    // Check if user already exists in staff_profiles
    const { data: existing } = await supabase
      .from("staff_profiles")
      .select("id")
      .eq("email", email)
      .limit(1);

    if (existing && existing.length > 0) {
      // User already registered — just update their profile
      await supabase
        .from("staff_profiles")
        .update({ role, restaurant_id: restaurantId || null })
        .eq("email", email);
      setMessage("Perfil do usuário atualizado.");
    } else {
      // Create a pending profile record so when the user registers, it gets picked up
      await supabase.from("staff_profiles").insert({
        email,
        role,
        restaurant_id: restaurantId || null,
      });
      setMessage(`Convite preparado. O usuário ${email} deve criar uma conta em /register.`);
    }

    setSaving(false);
    setEmail("");
    setRole("user");
    setRestaurantId("");
    onInvited();
    setTimeout(onClose, 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle className="font-heading text-lg">Convidar Usuário</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>E-mail *</Label>
            <Input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="usuario@email.com"
              className="rounded-xl mt-1"
            />
          </div>
          <div>
            <Label>Função *</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger className="rounded-xl mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="hostess">Operador</SelectItem>
                <SelectItem value="gerente">Gerente</SelectItem>
                <SelectItem value="admin">Administrador</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Restaurante</Label>
            <p className="text-xs text-muted-foreground mb-1">
              O usuário só terá acesso a este restaurante
            </p>
            <Select value={restaurantId} onValueChange={setRestaurantId}>
              <SelectTrigger className="rounded-xl">
                <SelectValue placeholder="Selecione o restaurante" />
              </SelectTrigger>
              <SelectContent>
                {restaurants.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {message && (
            <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-xl px-3 py-2">
              {message}
            </p>
          )}
          <Button
            type="submit"
            disabled={saving}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl"
          >
            {saving ? "Salvando..." : "Convidar"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
