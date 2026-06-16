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
import { sortQueue } from "@/lib/queue";
import { normalizePhone, formatPhoneMask } from "@/lib/phone";
import { linkCustomer } from "@/lib/customers";
import { useCalledNotification } from "@/hooks/useCalledNotification";

const TERMINAL_STATUSES = ["sentado", "removido", "no_show"];
const storageKey = (restaurantId) => `queue_entry_${restaurantId}`;

export default function QueuePage() {
  const { restaurantId } = useParams();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [partySize, setPartySize] = useState("2");
  const [saving, setSaving] = useState(false);

  const [entryId, setEntryId] = useState(() => {
    // Restore from localStorage on first render
    return localStorage.getItem(storageKey(restaurantId)) || null;
  });
  const [myEntry, setMyEntry] = useState(null);
  const [waitingList, setWaitingList] = useState([]);

  const { data: restaurants = [] } = useQuery({
    queryKey: ["public-restaurant", restaurantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("restaurants")
        .select("*")
        .eq("id", restaurantId);
      if (error) throw error;
      return data;
    },
  });
  const restaurant = restaurants[0];

  // Fetch waiting list for a given service_date
  const fetchWaiting = async (serviceDate) => {
    const { data } = await supabase
      .from("waitlist_entries")
      .select("*")
      .eq("status", "aguardando")
      .eq("restaurant_id", restaurantId)
      .eq("service_date", serviceDate);
    if (data) setWaitingList(data);
  };

  useEffect(() => {
    if (!entryId) return;

    // Fetch this entry's current state
    const fetchMyEntry = async () => {
      const { data } = await supabase
        .from("waitlist_entries")
        .select("*")
        .eq("id", entryId)
        .single();
      if (!data) {
        // Entry not found — clear storage
        localStorage.removeItem(storageKey(restaurantId));
        setEntryId(null);
        return;
      }
      setMyEntry(data);
      if (data.status === "aguardando") {
        fetchWaiting(data.service_date);
      }
      if (TERMINAL_STATUSES.includes(data.status)) {
        localStorage.removeItem(storageKey(restaurantId));
      }
    };

    fetchMyEntry();

    // Subscribe to changes on THIS entry
    const myChannel = supabase
      .channel(`queue-my-${entryId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "waitlist_entries", filter: `id=eq.${entryId}` },
        (payload) => {
          setMyEntry(payload.new);
          if (payload.new.status === "aguardando") {
            fetchWaiting(payload.new.service_date);
          }
          if (TERMINAL_STATUSES.includes(payload.new.status)) {
            localStorage.removeItem(storageKey(restaurantId));
          }
        }
      )
      .subscribe();

    // Subscribe to ALL waitlist changes to update position and my entry
    const listChannel = supabase
      .channel(`queue-list-${restaurantId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "waitlist_entries" },
        async (payload) => {
          const rid = payload.new?.restaurant_id || payload.old?.restaurant_id;
          if (rid !== restaurantId) return;

          // If MY entry changed, update it directly from payload
          if (payload.new?.id === entryId) {
            setMyEntry(payload.new);
            if (TERMINAL_STATUSES.includes(payload.new.status)) {
              localStorage.removeItem(storageKey(restaurantId));
            }
          }

          // Refresh waiting list for position updates
          const { data: myData } = await supabase
            .from("waitlist_entries")
            .select("service_date, status")
            .eq("id", entryId)
            .single();
          if (myData?.status === "aguardando") fetchWaiting(myData.service_date);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(myChannel);
      supabase.removeChannel(listChannel);
    };
  }, [entryId, restaurantId]);

  useCalledNotification(myEntry);

  const myPosition = myEntry && myEntry.status === "aguardando"
    ? sortQueue(waitingList).findIndex((e) => e.id === myEntry.id) + 1
    : 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    const today = format(new Date(), "yyyy-MM-dd");
    const customerId = await linkCustomer(restaurantId, { name, phone });
    const { data: entry } = await supabase
      .from("waitlist_entries")
      .insert({
        customer_name: name,
        customer_phone: normalizePhone(phone),
        party_size: Number(partySize),
        status: "aguardando",
        service_date: today,
        restaurant_id: restaurantId,
        ...(customerId ? { customer_id: customerId } : {}),
      })
      .select()
      .single();
    setSaving(false);
    if (entry) {
      localStorage.setItem(storageKey(restaurantId), entry.id);
      setEntryId(entry.id);
    }
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
                onChange={(e) => setPhone(formatPhoneMask(e.target.value))}
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
