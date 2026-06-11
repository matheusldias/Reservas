import React, { useState } from "react";
import { useParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PauseCircle } from "lucide-react";
import { format } from "date-fns";
import PublicHeader from "@/components/public/PublicHeader";
import QueueStatusCard from "@/components/public/QueueStatusCard";
import { sortQueue } from "@/lib/queue";

export default function QueuePage() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [partySize, setPartySize] = useState("2");
  const [saving, setSaving] = useState(false);
  const [entryId, setEntryId] = useState(null);

  const { restaurantId } = useParams();

  const { data: restaurants = [] } = useQuery({
    queryKey: ["public-restaurant", restaurantId],
    queryFn: () => base44.entities.Restaurant.filter({ id: restaurantId }),
  });
  const restaurant = restaurants[0];

  const { data: myEntries = [] } = useQuery({
    queryKey: ["queue-my-entry", entryId],
    queryFn: () => base44.entities.WaitlistEntry.filter({ id: entryId }),
    enabled: !!entryId,
    refetchInterval: 7000,
  });
  const myEntry = myEntries[0];

  const { data: waitingList = [] } = useQuery({
    queryKey: ["queue-waiting", restaurantId, myEntry?.service_date],
    queryFn: () =>
      base44.entities.WaitlistEntry.filter({
        status: "aguardando",
        restaurant_id: restaurantId,
        service_date: myEntry.service_date,
      }),
    enabled: !!myEntry && myEntry.status === "aguardando",
    refetchInterval: 7000,
  });

  const myPosition = myEntry
    ? sortQueue(waitingList).findIndex((e) => e.id === myEntry.id) + 1
    : 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    const today = format(new Date(), "yyyy-MM-dd");
    const entry = await base44.entities.WaitlistEntry.create({
      customer_name: name,
      customer_phone: phone,
      party_size: Number(partySize),
      status: "aguardando",
      service_date: today,
      restaurant_id: restaurantId,
    });
    setSaving(false);
    setEntryId(entry.id);
  };

  if (entryId) {
    return <QueueStatusCard entry={myEntry} position={myPosition} />;
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