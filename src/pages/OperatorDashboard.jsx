import React, { useState, useEffect } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useRestaurant } from "@/lib/RestaurantContext";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CalendarClock, Users, Plus, Pause, Play, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import ReservationList from "@/components/operator/ReservationList";
import WaitlistList from "@/components/operator/WaitlistList";
import AddReservationDialog from "@/components/operator/AddReservationDialog";
import AddWaitlistDialog from "@/components/operator/AddWaitlistDialog";
import ShareLinks from "@/components/operator/ShareLinks";
import ReservationCalendarDialog from "@/components/operator/ReservationCalendarDialog";
import QueueMetrics from "@/components/operator/QueueMetrics";
import WaitlistHistory from "@/components/operator/WaitlistHistory";

export default function OperatorDashboard() {
  const today = format(new Date(), "yyyy-MM-dd");
  const [selectedDate, setSelectedDate] = useState(today);
  const [activeTab, setActiveTab] = useState("reservations");
  const [showAddReservation, setShowAddReservation] = useState(false);
  const [showAddWaitlist, setShowAddWaitlist] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [queueView, setQueueView] = useState("hoje");

  const { restaurant, refetchRestaurants } = useRestaurant();

  const toggleQueuePause = async () => {
    if (!restaurant) return;
    await supabase
      .from("restaurants")
      .update({ queue_paused: !restaurant.queue_paused })
      .eq("id", restaurant.id);
    refetchRestaurants();
  };

  const { data: reservations = [], refetch: refetchReservations } = useQuery({
    queryKey: ["reservations", selectedDate, restaurant?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reservations")
        .select("*")
        .eq("date", selectedDate)
        .eq("restaurant_id", restaurant.id);
      if (error) throw error;
      return data;
    },
    enabled: !!restaurant,
    placeholderData: keepPreviousData,
    refetchInterval: 30000, // plano B: atualiza a cada 30s mesmo se o realtime cair
  });

  const { data: todayWaitlist = [], refetch: refetchWaitlist } = useQuery({
    queryKey: ["waitlist", restaurant?.id, today],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("waitlist_entries")
        .select("*")
        .eq("restaurant_id", restaurant.id)
        .eq("service_date", today)
        .order("created_at", { ascending: true })
        .limit(200);
      if (error) throw error;
      return data;
    },
    enabled: !!restaurant,
    refetchInterval: 30000, // plano B: atualiza a cada 30s mesmo se o realtime cair
  });

  const allActiveWaitlist = todayWaitlist.filter(
    (e) => e.status === "aguardando" || e.status === "chamado"
  );

  const activeReservations = reservations.filter(
    (r) => r.status !== "cancelada" && r.status !== "no_show" && r.status !== "concluida"
  );

  const refetchAll = () => {
    refetchReservations();
    refetchWaitlist();
  };

  // Realtime: atualiza automaticamente quando reservas ou fila mudam
  useEffect(() => {
    if (!restaurant?.id) return;

    const reservationsChannel = supabase
      .channel(`operator-reservations-${restaurant.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "reservations" },
        (payload) => {
          const rid = payload.new?.restaurant_id || payload.old?.restaurant_id;
          if (rid === restaurant.id) refetchReservations();
        }
      )
      .subscribe();

    const waitlistChannel = supabase
      .channel(`operator-waitlist-${restaurant.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "waitlist_entries" },
        (payload) => {
          const rid = payload.new?.restaurant_id || payload.old?.restaurant_id;
          if (rid === restaurant.id) refetchWaitlist();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(reservationsChannel);
      supabase.removeChannel(waitlistChannel);
    };
  }, [restaurant?.id]);

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

      {/* Links para clientes */}
      <ShareLinks restaurant={restaurant} />

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
          <div className="mb-4 flex items-center gap-2">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-card border border-border rounded-xl px-4 py-2 text-sm text-foreground"
            />
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowCalendar(true)}
              className="rounded-xl text-xs h-[38px]"
            >
              <CalendarDays className="w-4 h-4 mr-1" /> Calendário
            </Button>
          </div>
          <ReservationList
            reservations={reservations}
            onUpdate={refetchAll}
          />
        </TabsContent>

        <TabsContent value="waitlist" className="mt-4">
          <div className="mb-4 flex items-center gap-2 flex-wrap">
            <div className="inline-flex bg-muted rounded-xl p-1">
              <button
                onClick={() => setQueueView("hoje")}
                className={`px-4 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                  queueView === "hoje"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground"
                }`}
              >
                Hoje
              </button>
              <button
                onClick={() => setQueueView("historico")}
                className={`px-4 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                  queueView === "historico"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground"
                }`}
              >
                Histórico
              </button>
            </div>
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
          {restaurant?.queue_paused && queueView === "hoje" && (
            <div className="mb-4 bg-amber-50 border border-amber-200 text-amber-700 text-sm rounded-xl px-4 py-3">
              A fila está pausada. Novas entradas estão suspensas.
            </div>
          )}
          {queueView === "hoje" ? (
            <>
              <QueueMetrics entries={todayWaitlist} />
              <WaitlistList
                entries={allActiveWaitlist}
                onUpdate={refetchAll}
                callTimeoutMinutes={restaurant?.queue_call_timeout_minutes || 5}
              />
            </>
          ) : (
            <WaitlistHistory restaurantId={restaurant?.id} />
          )}
        </TabsContent>
      </Tabs>

      <AddReservationDialog
        open={showAddReservation}
        onClose={() => setShowAddReservation(false)}
        onSuccess={refetchAll}
        restaurant={restaurant}
      />
      <AddWaitlistDialog
        open={showAddWaitlist}
        onClose={() => setShowAddWaitlist(false)}
        onSuccess={refetchAll}
        restaurantId={restaurant?.id}
      />
      <ReservationCalendarDialog
        open={showCalendar}
        onClose={() => setShowCalendar(false)}
        restaurantId={restaurant?.id}
        onSelectDate={(date) => {
          setSelectedDate(date);
          setActiveTab("reservations");
        }}
      />
    </div>
  );
}
