import React, { useState } from "react";
import { useParams } from "react-router-dom";
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
import { CheckCircle2, CalendarClock, MapPin, Users, Clock, ChevronLeft } from "lucide-react";
import { format, addDays } from "date-fns";
import { getAvailableSlots } from "@/lib/publicSlots";
import { checkCapacity } from "@/lib/capacity";
import { normalizePhone, formatPhoneMask } from "@/lib/phone";
import { linkCustomer } from "@/lib/customers";

export default function ReservePage() {
  const [step, setStep] = useState(1); // 1: booking, 2: user data
  const [roomId, setRoomId] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [partySize, setPartySize] = useState("2");
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const { restaurantId } = useParams();

  const { data: restaurants = [] } = useQuery({
    queryKey: ["public-restaurant", restaurantId],
    queryFn: () => base44.entities.Restaurant.filter({ id: restaurantId }),
  });
  const restaurant = restaurants[0];

  const { data: rooms = [] } = useQuery({
    queryKey: ["public-rooms", restaurantId],
    queryFn: () => base44.entities.DiningRoom.filter({ restaurant_id: restaurantId }),
  });

  const room = rooms.find((r) => r.id === roomId);
  const slots = getAvailableSlots(room, date);

  const today = format(new Date(), "yyyy-MM-dd");
  const maxDate = format(
    addDays(new Date(), restaurant?.booking_window_days || 30),
    "yyyy-MM-dd"
  );

  const canProceedToStep2 = roomId && date && time;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canProceedToStep2) {
      setStep(2);
      return;
    }
    setSaving(true);
    setError("");

    const durationMinutes = restaurant?.default_duration_minutes || 90;
    const dayReservations = await base44.entities.Reservation.filter({
      restaurant_id: restaurantId,
      date,
      dining_room_id: roomId,
    });
    const capacityInfo = checkCapacity({
      room,
      reservations: dayReservations,
      date,
      time,
      durationMinutes,
      partySize: Number(partySize),
    });
    if (capacityInfo && !capacityInfo.ok) {
      setError(
        `Capacidade excedida: restam ${capacityInfo.remaining} lugares neste horário`
      );
      setSaving(false);
      return;
    }

    const customerId = await linkCustomer(restaurantId, {
      name,
      phone,
      email,
    });
    await base44.entities.Reservation.create({
      customer_name: name,
      customer_phone: normalizePhone(phone),
      customer_email: email,
      date,
      time,
      duration_minutes: durationMinutes,
      party_size: Number(partySize),
      dining_room_id: roomId,
      status: "aguardando",
      restaurant_id: restaurantId,
      ...(customerId ? { customer_id: customerId } : {}),
    });
    setSaving(false);
    setDone(true);
  };

  if (done) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="bg-card rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <CheckCircle2 className="w-14 h-14 text-green-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-foreground mb-2">Reserva confirmada!</h2>
          <p className="text-sm text-muted-foreground mb-4">
            {name} · {Number(partySize)} {Number(partySize) === 1 ? "pessoa" : "pessoas"} · {format(new Date(date + "T12:00:00"), "dd/MM/yyyy")} às {time}
          </p>
          <p className="text-xs text-muted-foreground">
            Sua reserva está aguardando confirmação do restaurante.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-card border-b border-border">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {step === 2 && (
              <button
                onClick={() => setStep(1)}
                className="p-1.5 hover:bg-muted rounded-lg transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            )}
            <div>
              <p className="text-xs text-muted-foreground">Reserve com</p>
              <p className="text-lg font-bold text-foreground">{restaurant?.name || "Restaurante"}</p>
            </div>
          </div>
          <span className="text-xs text-muted-foreground">BR PT</span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 max-w-2xl mx-auto w-full px-4 py-6">
        {step === 1 ? (
          // Step 1: Booking Details
          <div className="bg-card rounded-2xl p-6">
            <h2 className="text-lg font-bold text-foreground mb-6">Escolha sua reserva</h2>
            <form onSubmit={(e) => { e.preventDefault(); setStep(2); }} className="space-y-4">
              <div>
                <Label className="text-red-500">* Salão</Label>
                <Select value={roomId} onValueChange={(v) => { setRoomId(v); setTime(""); }}>
                  <SelectTrigger className="rounded-lg mt-2 h-10">
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
                <Label className="text-red-500">* Pessoas</Label>
                <Select value={partySize} onValueChange={setPartySize}>
                  <SelectTrigger className="rounded-lg mt-2 h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                      <SelectItem key={n} value={String(n)}>
                        {n} {n === 1 ? "pessoa" : "pessoas"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-red-500">* Data</Label>
                <Input
                  type="date"
                  value={date}
                  min={today}
                  max={maxDate}
                  onChange={(e) => { setDate(e.target.value); setTime(""); }}
                  required
                  className="rounded-lg mt-2 h-10"
                />
              </div>

              {roomId && date && (
                <div>
                  <Label className="text-red-500">* Horário</Label>
                  {slots.length === 0 ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted rounded-lg p-3 mt-2">
                      <CalendarClock className="w-4 h-4" />
                      Sem horários disponíveis nesta data.
                    </div>
                  ) : (
                    <div className="grid grid-cols-4 gap-2 mt-2">
                      {slots.map((slot, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setTime(slot.start_time)}
                          className={`rounded-lg py-2 text-sm font-medium border transition-all ${
                            time === slot.start_time
                              ? "bg-primary text-primary-foreground border-primary"
                              : "bg-background text-foreground border-border hover:border-primary"
                          }`}
                        >
                          {slot.start_time}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <Button
                type="submit"
                disabled={!canProceedToStep2}
                className="w-full rounded-lg h-10 mt-6"
              >
                Continuar
              </Button>
            </form>
          </div>
        ) : (
          // Step 2: User Data
          <div className="space-y-4">
            {/* Booking Summary Card */}
            <div className="bg-card rounded-2xl p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-foreground">{room?.name || "Salão"}</h3>
                  <p className="text-xs text-muted-foreground mt-1">Salão Principal</p>
                </div>
                <button
                  onClick={() => setStep(1)}
                  className="text-xs font-medium text-primary hover:underline"
                >
                  Editar
                </button>
              </div>
              <div className="flex gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" />
                  {format(new Date(date + "T12:00:00"), "dd/MM/yyyy")}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  {time}
                </span>
                <span className="flex items-center gap-1">
                  <Users className="w-3.5 h-3.5" />
                  {partySize}p
                </span>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="bg-card rounded-2xl p-6 space-y-4">
              <h3 className="font-semibold text-foreground">Seus dados</h3>

              <div>
                <Label className="text-red-500">* Nome completo</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Seu nome completo"
                  required
                  className="rounded-lg mt-2 h-10"
                />
              </div>

              <div>
                <Label>E-mail</Label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  className="rounded-lg mt-2 h-10"
                />
              </div>

              <div>
                <Label>Celular</Label>
                <div className="flex mt-2">
                  <span className="flex items-center px-3 h-10 border border-r-0 border-input rounded-l-lg bg-muted text-sm text-muted-foreground">
                    🇧🇷 +55
                  </span>
                  <Input
                    value={phone}
                    onChange={(e) => setPhone(formatPhoneMask(e.target.value))}
                    placeholder="(11) 99999-9999"
                    className="rounded-l-none h-10"
                  />
                </div>
              </div>

              {restaurant?.booking_rules && (
                <div className="border-t pt-4 mt-4">
                  <h4 className="font-semibold text-sm text-foreground mb-2">Sobre a Reserva</h4>
                  <div className="bg-muted rounded-lg p-3 text-xs text-muted-foreground whitespace-pre-wrap">
                    {restaurant.booking_rules}
                  </div>
                </div>
              )}

              {error && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}

              <Button
                type="submit"
                disabled={saving || !name}
                className="w-full rounded-lg h-10 mt-6"
              >
                {saving ? "Enviando..." : "Confirmar Reserva"}
              </Button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}