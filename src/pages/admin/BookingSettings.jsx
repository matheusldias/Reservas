import React, { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useRestaurant } from "@/lib/RestaurantContext";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Save, CalendarClock } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

export default function BookingSettings() {
  const { toast } = useToast();
  const { restaurant, refetchRestaurants } = useRestaurant();

  const [form, setForm] = useState({
    booking_window_days: 30,
    tolerance_minutes: 15,
    booking_rules: "",
  });

  useEffect(() => {
    if (restaurant) {
      setForm({
        booking_window_days: restaurant.booking_window_days || 30,
        tolerance_minutes: restaurant.tolerance_minutes || 15,
        booking_rules: restaurant.booking_rules || "",
      });
    }
  }, [restaurant]);

  const mutation = useMutation({
    mutationFn: async (data) =>
      base44.entities.Restaurant.update(restaurant.id, data),
    onSuccess: () => {
      refetchRestaurants();
      toast({ title: "Ajustes salvos!" });
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    mutation.mutate({
      booking_window_days: Number(form.booking_window_days),
      tolerance_minutes: Number(form.tolerance_minutes),
      booking_rules: form.booking_rules,
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-heading font-bold text-foreground flex items-center gap-2">
          <CalendarClock className="w-6 h-6 text-primary" />
          Ajustes de Reserva
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Defina a janela de reservas, tolerância e regras
          {restaurant ? ` · ${restaurant.name}` : ""}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5 max-w-lg">
        <div className="bg-card rounded-2xl border border-border p-6 space-y-4">
          <div>
            <Label>Janela de reserva (dias)</Label>
            <p className="text-xs text-muted-foreground mb-1">
              Quantos dias à frente o cliente pode reservar
            </p>
            <Input
              type="number"
              min={1}
              value={form.booking_window_days}
              onChange={(e) =>
                setForm({ ...form, booking_window_days: e.target.value })
              }
              className="rounded-xl"
            />
          </div>
          <div>
            <Label>Tolerância de atraso (minutos)</Label>
            <p className="text-xs text-muted-foreground mb-1">
              Tempo máximo de atraso antes de considerar no-show
            </p>
            <Input
              type="number"
              min={0}
              value={form.tolerance_minutes}
              onChange={(e) =>
                setForm({ ...form, tolerance_minutes: e.target.value })
              }
              className="rounded-xl"
            />
          </div>
          <div>
            <Label>Regras e condições</Label>
            <p className="text-xs text-muted-foreground mb-1">
              Texto exibido ao cliente no momento da reserva
            </p>
            <Textarea
              value={form.booking_rules}
              onChange={(e) =>
                setForm({ ...form, booking_rules: e.target.value })
              }
              placeholder="Ex: Cancelamentos devem ser feitos com 2h de antecedência..."
              className="rounded-xl"
              rows={4}
            />
          </div>
        </div>

        <Button
          type="submit"
          disabled={mutation.isPending}
          className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl"
        >
          <Save className="w-4 h-4 mr-2" />
          {mutation.isPending ? "Salvando..." : "Salvar Ajustes"}
        </Button>
      </form>
    </div>
  );
}