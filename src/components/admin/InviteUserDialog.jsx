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
import { Eye, EyeOff } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function InviteUserDialog({ open, onClose, restaurants, onInvited }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState("hostess");
  const [restaurantId, setRestaurantId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const reset = () => {
    setEmail("");
    setPassword("");
    setShowPassword(false);
    setRole("hostess");
    setRestaurantId("");
    setError("");
    setDone(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");

    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (!token) {
      setSaving(false);
      setError("Sessão expirada. Faça login novamente.");
      return;
    }

    let result;
    try {
      const res = await fetch("/api/create-staff", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          email,
          password,
          role,
          restaurant_id: restaurantId || null,
        }),
      });
      result = await res.json();
    } catch {
      result = { ok: false, error: "Falha de conexão. Tente novamente." };
    }

    setSaving(false);
    if (!result?.ok) {
      setError(result?.error || "Não foi possível criar o usuário.");
      return;
    }
    setDone(true);
    onInvited();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle className="font-heading text-lg">Novo Usuário</DialogTitle>
        </DialogHeader>

        {done ? (
          <div className="space-y-4">
            <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-xl px-3 py-3">
              Usuário criado! Passe estes dados de acesso para a pessoa:
            </p>
            <div className="bg-muted rounded-xl px-4 py-3 text-sm space-y-1">
              <p><span className="text-muted-foreground">E-mail:</span> <strong>{email}</strong></p>
              <p><span className="text-muted-foreground">Senha:</span> <strong>{password}</strong></p>
            </div>
            <p className="text-xs text-muted-foreground">
              Recomende que a pessoa troque a senha depois (em "Esqueci minha senha", se quiser).
            </p>
            <Button onClick={handleClose} className="w-full rounded-xl">
              Fechar
            </Button>
          </div>
        ) : (
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
              <Label>Senha *</Label>
              <div className="relative mt-1">
                <Input
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className="rounded-xl pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
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
            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
                {error}
              </p>
            )}
            <Button
              type="submit"
              disabled={saving}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl"
            >
              {saving ? "Criando..." : "Criar Usuário"}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
