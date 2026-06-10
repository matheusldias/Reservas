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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function InviteUserDialog({ open, onClose, restaurants, onInvited }) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("user");
  const [restaurantId, setRestaurantId] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    await base44.users.inviteUser(email, role);
    if (restaurantId) {
      const users = await base44.entities.User.filter({ email });
      if (users[0]) {
        await base44.entities.User.update(users[0].id, { restaurant_id: restaurantId });
      }
    }
    setSaving(false);
    setEmail("");
    setRole("user");
    setRestaurantId("");
    onInvited();
    onClose();
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
                <SelectItem value="user">Operador</SelectItem>
                <SelectItem value="admin">Administrador</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Restaurante *</Label>
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
          <Button
            type="submit"
            disabled={saving || !restaurantId}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl"
          >
            {saving ? "Enviando convite..." : "Convidar"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}