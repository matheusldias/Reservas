import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useRestaurant } from "@/lib/RestaurantContext";
import { format, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { BarChart3, CalendarCheck, Users, UserX, Phone } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatPhoneMask } from "@/lib/phone";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export default function Reports() {
  const [days, setDays] = useState(7);
  const { restaurant } = useRestaurant();

  const { data: reservations = [] } = useQuery({
    queryKey: ["all-reservations", restaurant?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reservations")
        .select("*")
        .eq("restaurant_id", restaurant.id)
        .order("date", { ascending: false })
        .limit(500);
      if (error) throw error;
      return data;
    },
    enabled: !!restaurant,
  });

  const { data: waitlist = [] } = useQuery({
    queryKey: ["all-waitlist", restaurant?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("waitlist_entries")
        .select("*")
        .eq("restaurant_id", restaurant.id)
        .order("service_date", { ascending: false })
        .limit(500);
      if (error) throw error;
      return data;
    },
    enabled: !!restaurant,
  });

  const stats = useMemo(() => {
    const now = new Date();
    const startDate = subDays(now, days);

    const filtered = reservations.filter(
      (r) => new Date(r.date) >= startDate && new Date(r.date) <= now
    );

    const totalReservations = filtered.length;
    const attended = filtered.filter((r) => r.status === "sentada").length;
    const noShows = filtered.filter((r) => r.status === "no_show").length;

    // Group by day
    const byDay = {};
    for (let i = 0; i < days; i++) {
      const d = format(subDays(now, days - 1 - i), "yyyy-MM-dd");
      byDay[d] = { date: d, total: 0, attended: 0, noShows: 0 };
    }

    filtered.forEach((r) => {
      if (byDay[r.date]) {
        byDay[r.date].total++;
        if (r.status === "sentada") byDay[r.date].attended++;
        if (r.status === "no_show") byDay[r.date].noShows++;
      }
    });

    const chartData = Object.values(byDay).map((d) => ({
      ...d,
      label: format(new Date(d.date + "T12:00:00"), "dd/MM", { locale: ptBR }),
    }));

    return { totalReservations, attended, noShows, chartData };
  }, [reservations, days]);

  // Lista de visitas no período: reservas sentadas/concluídas + fila sentada
  const visits = useMemo(() => {
    const now = new Date();
    const startDate = subDays(now, days);
    const inPeriod = (dateStr) => {
      const d = new Date(dateStr + "T12:00:00");
      return d >= startDate && d <= now;
    };

    const fromReservations = reservations
      .filter((r) => ["sentada", "concluida"].includes(r.status) && inPeriod(r.date))
      .map((r) => ({
        date: r.date,
        name: r.customer_name || "—",
        phone: r.customer_phone || "",
        origin: "Reserva",
      }));

    const fromWaitlist = waitlist
      .filter((w) => w.status === "sentado" && inPeriod(w.service_date))
      .map((w) => ({
        date: w.service_date,
        name: w.customer_name || "—",
        phone: w.customer_phone || "",
        origin: "Fila",
      }));

    return [...fromReservations, ...fromWaitlist].sort((a, b) =>
      a.date < b.date ? 1 : a.date > b.date ? -1 : 0
    );
  }, [reservations, waitlist, days]);

  const statCards = [
    {
      label: "Total de Reservas",
      value: stats.totalReservations,
      icon: CalendarCheck,
      color: "bg-primary/10 text-primary",
    },
    {
      label: "Clientes Atendidos",
      value: stats.attended,
      icon: Users,
      color: "bg-green-100 text-green-600",
    },
    {
      label: "No-shows",
      value: stats.noShows,
      icon: UserX,
      color: "bg-red-100 text-red-500",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-heading font-bold text-foreground flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-primary" />
          Relatórios
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Visão geral do desempenho
        </p>
      </div>

      {/* Period Filter */}
      <div className="flex gap-2">
        {[7, 14, 30].map((d) => (
          <button
            key={d}
            onClick={() => setDays(d)}
            className={`px-4 py-2 text-sm rounded-xl border transition-colors ${
              days === d
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card text-muted-foreground border-border hover:border-primary/30"
            }`}
          >
            {d} dias
          </button>
        ))}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {statCards.map((card) => (
          <div
            key={card.label}
            className="bg-card rounded-2xl border border-border p-5 shadow-sm"
          >
            <div className="flex items-center gap-3">
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${card.color}`}>
                <card.icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{card.value}</p>
                <p className="text-xs text-muted-foreground">{card.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div className="bg-card rounded-2xl border border-border p-5 shadow-sm">
        <h3 className="font-semibold text-foreground mb-4">Reservas por Dia</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stats.chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="label" fontSize={12} />
              <YAxis fontSize={12} />
              <Tooltip />
              <Bar
                dataKey="total"
                name="Total"
                fill="hsl(25, 95%, 53%)"
                radius={[6, 6, 0, 0]}
              />
              <Bar
                dataKey="attended"
                name="Atendidos"
                fill="hsl(142, 60%, 45%)"
                radius={[6, 6, 0, 0]}
              />
              <Bar
                dataKey="noShows"
                name="No-shows"
                fill="hsl(0, 70%, 55%)"
                radius={[6, 6, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Visitas no período */}
      <div className="bg-card rounded-2xl border border-border p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-foreground">Clientes que vieram</h3>
          <Badge variant="outline" className="text-xs">
            {visits.length} visita{visits.length !== 1 ? "s" : ""}
          </Badge>
        </div>

        {visits.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            Nenhuma visita registrada neste período.
          </p>
        ) : (
          <div className="divide-y divide-border">
            {/* Cabeçalho (desktop) */}
            <div className="hidden sm:grid grid-cols-[110px_1fr_160px_90px] gap-3 pb-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
              <span>Data</span>
              <span>Cliente</span>
              <span>Telefone</span>
              <span>Origem</span>
            </div>
            {visits.map((v, i) => (
              <div
                key={i}
                className="grid grid-cols-1 sm:grid-cols-[110px_1fr_160px_90px] gap-1 sm:gap-3 py-2.5 items-center"
              >
                <span className="text-sm font-medium text-foreground sm:font-normal">
                  {format(new Date(v.date + "T12:00:00"), "dd/MM/yyyy")}
                </span>
                <span className="text-sm text-foreground truncate">{v.name}</span>
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  {v.phone ? (
                    <>
                      <Phone className="w-3 h-3" />
                      {formatPhoneMask(v.phone)}
                    </>
                  ) : (
                    "—"
                  )}
                </span>
                <span>
                  <Badge
                    variant="outline"
                    className={`text-xs ${
                      v.origin === "Reserva"
                        ? "border-primary/30 text-primary"
                        : "border-accent-foreground/30 text-accent-foreground"
                    }`}
                  >
                    {v.origin}
                  </Badge>
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
