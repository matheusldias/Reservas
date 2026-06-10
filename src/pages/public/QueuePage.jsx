import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle2, PauseCircle } from "lucide-react";
import PublicHeader from "@/components/public/PublicHeader";

export default function QueuePage() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [partySize, setPartySize] = useState("2");
  const [saving, setSaving] = useState(false);
  const [position, setPosition] = useState(null);

  const { data: restaurants = [] } = useQuery({
    queryKey: ["public-restaurant"],
    queryFn: () => base44.entities.Restaurant.list(),
  });
  const restaurant = restaurants[0];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    const waiting = await base44.entities.WaitlistEntry.filter({ status: "aguardando" });
    const called = await base44.entities.WaitlistEntry.filter({ status: "chamado" });
    const newPosition = waiting.length + called.length + 1;
    await base44.entities.WaitlistEntry.create({
      customer_name: name,
      customer_phone: phone,
      party_size: Number(partySize),
      status: "aguardando",
      position: newPosition,
    });
    setSaving(false);
    setPosition(newPosition);
  };

  if (position !== null) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="bg-card rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <CheckCircle2 className="w-14 h-14 text-green-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-foreground mb-2">Você está na fila!</h2>
          <div className="bg-accent rounded-2xl py-6 my-4">
            <p className="text-xs text-accent-foreground uppercase tracking-wide mb-1">
              Sua posição
            </p>
            <p className="text-5xl font-bold text-primary">{position}º</p>
          </div>
          <p className="text-sm text-muted-foreground">
            {name} · {Number(partySize)} {Number(partySize) === 1 ? "pessoa" : "pessoas"}
          </p>
          <p className="text-xs text-muted-foreground mt-3">
            Aguarde ser chamado pela equipe do restaurante.
          </p>
        </div>
      </div>
    );
  }

  if (restaurant?.queue_paused) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="bg-card rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <PauseCircle className="w-14 h-14 text-amber-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-foreground mb-2">Fila pausada</h2>
          <p className="text-sm text-muted-foreground">
            No momento não estamos aceitando novas entradas na fila. Tente novamente em
            alguns minutos.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 sm:p-6">
      <div className="bg-card rounded-2xl shadow-lg p-6 sm:p-8 max-w-md w-full">
        <PublicHeader restaurant={restaurant} subtitle="Entre na fila de espera" />

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Nome *</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Seu nome"
              required
              className="rounded-xl mt-1"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Telefone</Label>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(00) 00000-0000"
                className="rounded-xl mt-1"
              />
            </div>
            <div>
              <Label>Pessoas *</Label>
              <Input
                type="number"
                min="1"
                value={partySize}
                onChange={(e) => setPartySize(e.target.value)}
                required
                className="rounded-xl mt-1"
              />
            </div>
          </div>

          <Button
            type="submit"
            disabled={saving || !name}
            className="w-full rounded-xl h-11"
          >
            {saving ? "Entrando..." : "Entrar na Fila"}
          </Button>
        </form>
      </div>
    </div>
  );
}