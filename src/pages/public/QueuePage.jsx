import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PauseCircle } from "lucide-react";
import { format } from "date-fns";
import PublicHeader from "@/components/public/PublicHeader";
import QueueStatusCard from "@/components/public/QueueStatusCard";
import { normalizePhone, formatPhoneMask } from "@/lib/phone";
import { useCalledNotification } from "@/hooks/useCalledNotification";

const TERMINAL_STATUSES = ["sentado", "removido", "no_show"];
const storageKey = (restaurantId) => `queue_entry_${restaurantId}`;
const POLL_MS = 7000;

export default function QueuePage() {
  const { restaurantId } = useParams();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [partySize, setPartySize] = useState("2");
  const [saving, setSaving] = useState(false);

  const [entryId, setEntryId] = useState(() =>
    localStorage.getItem(storageKey(restaurantId)) || null
  );
  const [myEntry, setMyEntry] = useState(null);

  const { data: restaurants = [] } = useQuery({
    queryKey: ["public-restaurant", restaurantId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("public_get_restaurant", {
        p_id: restaurantId,
      });
      if (error) throw error;
      return data;
    },
  });
  const restaurant = restaurants[0];

  // Busca status (posição calculada no servidor) — sem expor a fila inteira.
  useEffect(() => {
    if (!entryId) return;
    let active = true;

    const fetchStatus = async () => {
      const { data, error } = await supabase.rpc("public_queue_status", {
        p_entry_id: entryId,
      });
      if (!active) return;
      const row = data?.[0];
      if (error || !row) {
        // entrada não existe mais
        localStorage.removeItem(storageKey(restaurantId));
        setEntryId(null);
        setMyEntry(null);
        return;
      }
      setMyEntry({
        id: entryId,
        status: row.status,
        customer_name: row.customer_name,
        party_size: row.party_size,
        _position: row.queue_position,
      });
      if (TERMINAL_STATUSES.includes(row.status)) {
        localStorage.removeItem(storageKey(restaurantId));
      }
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, POLL_MS);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [entryId, restaurantId]);

  useCalledNotification(myEntry);

  const myPosition =
    myEntry && myEntry.status === "aguardando" ? myEntry._position || 0 : 0;

  const phoneValid = normalizePhone(phone).length >= 12;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!phoneValid) return;
    setSaving(true);
    const today = format(new Date(), "yyyy-MM-dd");
    const { data, error } = await supabase.rpc("public_join_queue", {
      p_restaurant_id: restaurantId,
      p_name: name,
      p_phone: normalizePhone(phone),
      p_party_size: Number(partySize),
      p_service_date: today,
    });
    setSaving(false);
    const row = data?.[0];
    if (error || !row) return;
    localStorage.setItem(storageKey(restaurantId), row.id);
    setEntryId(row.id);
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
              <Label>Telefone *</Label>
              <Input
                value={phone}
                onChange={(e) => setPhone(formatPhoneMask(e.target.value))}
                placeholder="(00) 00000-0000"
                required
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
            disabled={saving || !name || !phoneValid}
            className="w-full rounded-xl h-11"
          >
            {saving ? "Entrando..." : "Entrar na Fila"}
          </Button>
        </form>
      </div>
    </div>
  );
}
