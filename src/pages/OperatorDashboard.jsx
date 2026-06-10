import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useRestaurant } from "@/lib/RestaurantContext";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CalendarClock, Users, Plus, Pause, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import ReservationList from "@/components/operator/ReservationList";
import WaitlistList from "@/components/operator/WaitlistList";
import AddReservationDialog from "@/components/operator/AddReservationDialog";
import AddWaitlistDialog from "@/components/operator/AddWaitlistDialog";

export default function OperatorDashboard() {
  const today = format(new Date(), "yyyy-MM-dd");
  const [selectedDate, setSelectedDate] = useState(today);
  const [activeTab, setActiveTab] = useState("reservations");
  const [showAddReservation, setShowAddReservation] = useState(false);
  const [showAddWaitlist, setShowAddWaitlist] = useState(false);

  const { restaurant, refetchRestaurants } = useRestaurant();

  const toggleQueuePause = async () => {
    if (!restaurant) return;
    await base44.entities.Restaurant.update(restaurant.id, {
      queue_paused: !restaurant.queue_paused,
    });
    refetchRestaurants();
  };

  const { data: reservations = [], refetch: refetchReservations } = useQuery({
    queryKey: ["reservations", selectedDate, restaurant?.id],
    queryFn: () =>
      base44.entities.Reservation.filter({
        date: selectedDate,
        restaurant_id: restaurant.id,
      }),
    enabled: !!restaurant,
  });

  const { data: waitlist = [], refetch: refetchWaitlist } = useQuery({
    queryKey: ["waitlist", restaurant?.id],
    queryFn: () => base44.entities.WaitlistEntry.filter(
      { status: "aguardando", restaurant_id: restaurant.id },
      "created_date",
      100
    ),
    enabled: !!restaurant,
  });

  const { data: calledWaitlist = [], refetch: refetchCalled } = useQuery({
    queryKey: ["waitlist-called", restaurant?.id],
    queryFn: () => base44.entities.WaitlistEntry.filter(
      { status: "chamado", restaurant_id: restaurant.id },
      "created_date",
      100
    ),
    enabled: !!restaurant,
  });

  const allActiveWaitlist = [...waitlist, ...calledWaitlist].sort(
    (a, b) => new Date(a.created_date) - new Date(b.created_date)
  );

  const activeReservations = reservations.filter(
    (r) => r.status !== "cancelada" && r.status !== "sentada" && r.status !== "no_show"
  );

  const refetchAll = () => {
    refetchReservations();
    refetchWaitlist();
    refetchCalled();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-heading font-bold text-foreground">
          Painel de Operação
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR })}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-card rounded-2xl p-4 border border-border shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <CalendarClock className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">
                {activeReservations.length}
              </p>
              <p className="text-xs text-muted-foreground">Reservas ativas</p>
            </div>
          </div>
        </div>
        <div className="bg-card rounded-2xl p-4 border border-border shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center">
              <Users className="w-5 h-5 text-accent-foreground" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">
                {allActiveWaitlist.length}
              </p>
              <p className="text-xs text-muted-foreground">Na fila</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex items-center justify-between gap-3">
          <TabsList className="bg-muted rounded-xl p-1 h-auto">
            <TabsTrigger
              value="reservations"
              className="rounded-lg px-4 py-2 text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              Reservas
            </TabsTrigger>
            <TabsTrigger
              value="waitlist"
              className="rounded-lg px-4 py-2 text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              Fila
            </TabsTrigger>
          </TabsList>

          <Button
            size="sm"
            onClick={() =>
              activeTab === "reservations"
                ? setShowAddReservation(true)
                : setShowAddWaitlist(true)
            }
            className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl shadow-md"
          >
            <Plus className="w-4 h-4 mr-1" />
            Adicionar
          </Button>
        </div>

        <TabsContent value="reservations" className="mt-4">
          <div className="mb-4">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-card border border-border rounded-xl px-4 py-2 text-sm text-foreground"
            />
          </div>
          <ReservationList
            reservations={reservations}
            onUpdate={refetchAll}
          />
        </TabsContent>

        <TabsContent value="waitlist" className="mt-4">
          <div className="mb-4">
            <Button
              size="sm"
              variant="outline"
              onClick={toggleQueuePause}
              className={`rounded-xl text-xs ${
                restaurant?.queue_paused
                  ? "border-green-300 text-green-600 hover:bg-green-50"
                  : "border-primary/30 text-primary hover:bg-accent"
              }`}
            >
              {restaurant?.queue_paused ? (
                <>
                  <Play className="w-3.5 h-3.5 mr-1" /> Retomar Fila
                </>
              ) : (
                <>
                  <Pause className="w-3.5 h-3.5 mr-1" /> Pausar Fila
                </>
              )}
            </Button>
          </div>
          {restaurant?.queue_paused && (
            <div className="mb-4 bg-amber-50 border border-amber-200 text-amber-700 text-sm rounded-xl px-4 py-3">
              A fila está pausada. Novas entradas estão suspensas.
            </div>
          )}
          <WaitlistList entries={allActiveWaitlist} onUpdate={refetchAll} />
        </TabsContent>
      </Tabs>

      <AddReservationDialog
        open={showAddReservation}
        onClose={() => setShowAddReservation(false)}
        onSuccess={refetchAll}
        restaurantId={restaurant?.id}
      />
      <AddWaitlistDialog
        open={showAddWaitlist}
        onClose={() => setShowAddWaitlist(false)}
        onSuccess={refetchAll}
        restaurantId={restaurant?.id}
      />
    </div>
  );
}