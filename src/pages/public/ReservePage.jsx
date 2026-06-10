import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CheckCircle2, CalendarClock } from "lucide-react";
import { format, addDays } from "date-fns";
import PublicHeader from "@/components/public/PublicHeader";
import { getAvailableSlots } from "@/lib/publicSlots";

export default function ReservePage() {
  const [roomId, setRoomId] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [partySize, setPartySize] = useState("2");
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  const { data: restaurants = [] } = useQuery({
    queryKey: ["public-restaurant"],
    queryFn: () => base44.entities.Restaurant.list(),
  });
  const restaurant = restaurants[0];

  const { data: rooms = [] } = useQuery({
    queryKey: ["public-rooms"],
    queryFn: () => base44.entities.DiningRoom.list(),
  });

  const room = rooms.find((r) => r.id === roomId);
  const slots = getAvailableSlots(room, date);

  const today = format(new Date(), "yyyy-MM-dd");
  const maxDate = format(
    addDays(new Date(), restaurant?.booking_window_days || 30),
    "yyyy-MM-dd"
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    await base44.entities.Reservation.create({
      customer_name: name,
      customer_phone: phone,
      date,
      time,
      party_size: Number(partySize),
      dining_room_id: roomId,
      status: "aguardando",
    });
    setSaving(false);
    setDone(true);
  };

  if (done) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="bg-card rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <CheckCircle2 className="w-14 h-14 text-green-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-foreground mb-2">Reserva solicitada!</h2>
          <p className="text-sm text-muted-foreground mb-1">
            {name} · {Number(partySize)} {Number(partySize) === 1 ? "pessoa" : "pessoas"}
          </p>
          <p className="text-sm text-muted-foreground mb-4">
            {format(new Date(date + "T12:00:00"), "dd/MM/yyyy")} às {time}
            {room ? ` · ${room.name}` : ""}
          </p>
          <p className="text-xs text-muted-foreground">
            Sua reserva está aguardando confirmação do restaurante.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 sm:p-6">
      <div className="bg-card rounded-2xl shadow-lg p-6 sm:p-8 max-w-md w-full">
        <PublicHeader restaurant={restaurant} subtitle="Faça sua reserva" />

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Salão *</Label>
            <Select value={roomId} onValueChange={(v) => { setRoomId(v); setTime(""); }}>
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

          <div>
            <Label>Data *</Label>
            <Input
              type="date"
              value={date}
              min={today}
              max={maxDate}
              onChange={(e) => { setDate(e.target.value); setTime(""); }}
              required
              className="rounded-xl mt-1"
            />
          </div>

          {roomId && date && (
            <div>
              <Label>Horário *</Label>
              {slots.length === 0 ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted rounded-xl p-3 mt-1">
                  <CalendarClock className="w-4 h-4" />
                  Sem horários disponíveis nesta data.
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2 mt-1">
                  {slots.map((slot, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setTime(slot.start_time)}
                      className={`rounded-xl py-2 text-sm font-medium border transition-colors ${
                        time === slot.start_time
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-card text-foreground border-border hover:border-primary"
                      }`}
                    >
                      {slot.start_time}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

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

          {restaurant?.booking_rules && (
            <div className="bg-accent rounded-xl p-3 text-xs text-accent-foreground whitespace-pre-line">
              {restaurant.booking_rules}
            </div>
          )}

          <Button
            type="submit"
            disabled={saving || !roomId || !date || !time || !name}
            className="w-full rounded-xl h-11"
          >
            {saving ? "Enviando..." : "Confirmar Reserva"}
          </Button>
        </form>
      </div>
    </div>
  );
}